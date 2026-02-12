# 🔍 Scalability & Performance Audit Report

**Date**: February 12, 2026\
**Project**: Bill Watch Chronicles\
**Auditor**: AI Assistant

---

## ✅ CURRENT STRENGTHS

### 1. **Pagination & Indexing Implemented** ⭐⭐⭐⭐⭐

- React Query with pagination in `useBillsQuery.ts` and `useDocumentsQuery.ts`
- Page-based data fetching (`page`, `pageSize` parameters)
- `keepPreviousData` for smooth pagination UX
- Database range queries with `.range(from, to)`

### 2. **Query Optimization** ⭐⭐⭐⭐

- Selective field fetching where needed
- Proper indexing with `.order()` and `.eq()` clauses
- Query invalidation using React Query

### 3. **Context Management** ⭐⭐⭐

- Disabled automatic real-time subscriptions (commented out in lines 159-187 of
  BillContext, 116-142 of DocumentContext)
- Using React Query for cache management
- Query client invalidation on mutations

---

## 🚨 CRITICAL ISSUES

### 1. **⚠️ DISABLED AUTO-FETCH BUT FETCH FUNCTIONS NEVER CALLED**

**Severity**: HIGH\
**Location**: `BillContext.tsx` (lines 132-156), `DocumentContext.tsx` (lines
92-113)

**Problem**:

- `_fetchBills()` and `_fetchDocuments()` functions are defined
- The `useEffect` hooks that call them are commented out
- **NO OTHER CODE CALLS THESE FUNCTIONS**
- This means the Context state (`bills` and `dbDocuments`) is **ALWAYS EMPTY**

**Impact**:

- `searchBills()`, `filterBills()`, `getBillById()` in BillContext operate on
  **empty arrays**
- Same for DocumentContext search/filter functions
- Any component using Context directly (not React Query) will have NO DATA

**Solution**: Either:

1. Remove the functions and state entirely, rely 100% on React Query
2. OR call fetch functions manually when needed

---

### 2. **⚠️ POTENTIAL NULL REFERENCE ERRORS**

**Severity**: MEDIUM\
**Locations**:

- `BillContext.tsx` line 545: `bill.presentationDate.getFullYear()`
- `DocumentContext.tsx` line 536: `doc.presentationDate.getFullYear()`

**Problem**:

```typescript
if (filters.year && bill.presentationDate.getFullYear() !== filters.year) {
    return false;
}
```

`presentationDate` can be `null`, this will crash with "Cannot read property
'getFullYear' of null"

**Solution**:

```typescript
if (filters.year && bill.presentationDate?.getFullYear() !== filters.year) {
    return false;
}
```

---

### 3. **⚠️ N+1 QUERY PROBLEM IN STATS**

**Severity**: MEDIUM\
**Location**: `useBillsQuery.ts` (lines 122-124), `useDocumentsQuery.ts` (lines
120-122)

**Problem**: Stats queries fetch **ALL** records to calculate counts:

```typescript
const { data: bills, error } = await supabase
    .from("bills")
    .select("id, status, presentation_date, extensions_count, created_at");
```

With **10,000+ bills**, this fetches 10,000 rows just to count!

**Impact**:

- Slow dashboard load times
- Excessive data transfer
- Client-side counting inefficient

**Solution**: Use Supabase aggregation or move to server-side counting:

```typescript
// Option 1: Use count with filters
const { count: pendingCount } = await supabase
    .from("bills")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

// Option 2: Create a materialized view or database function
```

---

### 4. **⚠️ MISSING MEMOIZATION IN CONTEXTS**

**Severity**: LOW-MEDIUM\
**Location**: `BillContext.tsx`, `DocumentContext.tsx`

**Problem**: Functions like `searchBills`, `filterBills`, `pendingBills` are
recreated on every render.

**Impact**:

- Components using these functions re-render unnecessarily
- Wasted computation

**Solution**: Use `useCallback` for functions and `useMemo` for derived data:

```typescript
const pendingBills = useMemo(
    () =>
        bills.filter((bill) => bill.status === "pending")
            .sort((a, b) =>
                a.presentationDate
                    ? a.presentationDate.getTime() -
                        b.presentationDate.getTime()
                    : 0
            ),
    [bills],
);

const searchBills = useCallback((query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return bills.filter((bill) =>
        bill.title.toLowerCase().includes(lowercaseQuery) ||
        bill.committee.toLowerCase().includes(lowercaseQuery)
    );
}, [bills]);
```

---

### 5. **⚠️ NO LOADING/ERROR STATES IN QUERY HOOKS**

**Severity**: LOW\
**Location**: Query hooks don't expose loading/error states consistently

**Problem**: Components may not handle loading states properly.

**Solution**: Ensure all components using queries check:

```typescript
const { data, isLoading, error } = useBillList(filters);

if (isLoading) return <BillListSkeleton />;
if (error) return <ErrorState />;
```

---

## 💡 PERFORMANCE IMPROVEMENTS

### 1. **Implement Database Indexes** ⭐⭐⭐⭐⭐

**Priority**: HIGH

Ensure these indexes exist in Supabase:

```sql
-- Bills table
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_committee ON bills(committee);
CREATE INDEX idx_bills_presentation_date ON bills(presentation_date);
CREATE INDEX idx_bills_created_at ON bills(created_at DESC);
CREATE INDEX idx_bills_status_presentation_date ON bills(status, presentation_date);

-- Documents table  
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_committee ON documents(committee);
CREATE INDEX idx_documents_presentation_date ON documents(presentation_date);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_type_status ON documents(type, status);
```

### 2. **Add Caching Layer** ⭐⭐⭐⭐

**Priority**: MEDIUM

Implement stale-while-revalidate caching:

```typescript
export const useBillStats = () => {
    return useQuery({
        queryKey: ["bills-stats"],
        queryFn: async () => {/* ... */},
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
    });
};
```

### 3. **Implement Virtual Scrolling** ⭐⭐⭐

**Priority**: MEDIUM

For long lists, use `react-virtual` or `react-window`:

```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

// In component
const virtualizer = useVirtualizer({
    count: bills.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
});
```

### 4. **Optimize Search with Debouncing** ⭐⭐⭐⭐

**Priority**: HIGH

Already using search queries, but add debouncing:

```typescript
import { useDebouncedValue } from "@/hooks/use-debounce";

const [searchTerm, setSearchTerm] = useState("");
const debouncedSearch = useDebouncedValue(searchTerm, 300);

const { data } = useBillList({ search: debouncedSearch });
```

### 5. **Lazy Load Components** ⭐⭐⭐

**Priority**: MEDIUM

Use React.lazy for route-based code splitting:

```typescript
const AnalyticsView = React.lazy(() =>
    import("@/pages/dashboard/AnalyticsView")
);
```

---

## 🔧 RECOMMENDED FIXES (Priority Order)

### IMMEDIATE (Do Now)

1. ✅ **Fix null reference errors** - Add optional chaining
2. ✅ **Add database indexes** - Critical for query performance
3. ✅ **Resolve Context state issue** - Decide on Context vs React Query
   approach

### HIGH PRIORITY (This Week)

4. ✅ **Optimize stats queries** - Use aggregation instead of fetching all
5. ✅ **Add memoization** - useCallback and useMemo
6. ✅ **Implement caching strategies** - staleTime and cacheTime

### MEDIUM PRIORITY (Next Sprint)

7. ✅ **Add debouncing to search**
8. ✅ **Implement virtual scrolling** for large lists
9. ✅ **Lazy load routes**

### LOW PRIORITY (Nice to Have)

10. ✅ **Service Worker for offline** capability
11. ✅ **Prefetch next page** on pagination
12. ✅ **Compression** on API responses

---

## 📊 ESTIMATED IMPACT

| Fix               | Load Time Improvement | Scalability | Complexity |
| ----------------- | --------------------- | ----------- | ---------- |
| Database Indexes  | 60-80%                | High        | Low        |
| Stats Aggregation | 70-90%                | High        | Medium     |
| Memoization       | 10-20%                | Medium      | Low        |
| Virtual Scrolling | 40-60%                | High        | Medium     |
| Caching Strategy  | 30-50%                | High        | Low        |

---

## 🎯 BROKEN/HANGING LOGIC

### 1. **Unused Context State**

- `bills` and `dbDocuments` in contexts are never populated
- Should either remove or implement proper fetching

### 2. **Deprecated Fields**

- `underReviewBills` array is empty but still in interface
- Should remove from interface and all usages

### 3. **Status Message Mismatch**

- Some status messages reference old statuses
- Update to match current status types

---

## ✅ NEXT STEPS

1. **Review this audit** with team
2. **Prioritize fixes** based on impact
3. **Create implementation plan**
4. **Test performance** improvements
5. **Monitor metrics** post-deployment

---

**End of Audit Report**


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useBillList } from "@/hooks/useBillsQuery.ts";
import { useDocumentList } from "@/hooks/useDocumentsQuery.ts";
import { useBills } from "@/contexts/BillContext.tsx";
import { useDocuments } from "@/contexts/DocumentContext.tsx";

export default function ReviewBusinessView() {
  // Use hooks to fetch ONLY under_review items
  const { data: bills } = useBillList({ status: "under_review", pageSize: 100 });
  const { data: docs } = useDocumentList({ status: "under_review", pageSize: 100 }); // Fetches all types

  const { approveBill, rejectBill } = useBills();
  const { approveDocument, rejectDocument } = useDocuments();


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Review Business</h1>
      <p className="text-muted-foreground">Approve or Reject items submitted for review.</p>

      <Tabs defaultValue="bills">
        <TabsList>
            <TabsTrigger value="bills">Bills ({bills?.count || 0})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({docs?.count || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="mt-6">
             {bills && bills.data.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {bills.data.map(bill => (
                        <Card key={bill.id} className="border-l-4 border-l-orange-400">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">Under Review</span>
                                <CardTitle className="text-lg mt-2">{bill.title}</CardTitle>
                              </div>
                              <div className="text-xs text-muted-foreground">{new Date(bill.createdAt).toLocaleDateString()}</div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-gray-600 mb-4">Committee: {bill.committee}</p>
                            <div className="flex gap-2 justify-end">
                              <button 
                                type="button"
                                onClick={() => rejectBill(bill.id)} 
                                className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded border border-red-200"
                              >
                                Reject
                              </button>
                              <button 
                                type="button"
                                onClick={() => approveBill(bill.id)} 
                                className="px-3 py-1 text-sm text-white bg-green-600 hover:bg-green-700 rounded shadow-sm"
                              >
                                Approve
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                    ))}
                </div>
             ) : (
                <div className="text-center py-12 text-muted-foreground">No bills under review.</div>
             )}
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
             {docs && docs.data.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {docs.data.map(doc => (
                        <Card key={doc.id} className="border-l-4 border-l-blue-400">
                           <CardHeader className="pb-2">
                             <div className="flex justify-between items-start">
                               <div>
                                 <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">Under Review</span>
                                 <CardTitle className="text-lg mt-2">{doc.title}</CardTitle>
                               </div>
                               <div className="text-xs text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString()}</div>
                             </div>
                           </CardHeader>
                           <CardContent>
                             <p className="text-sm text-gray-600 mb-4">Committee: {doc.committee}</p>
                             <div className="flex gap-2 justify-end">
                               <button 
                                 type="button"
                                 onClick={() => rejectDocument(doc.id)}
                                 className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded border border-red-200"
                               >
                                 Reject
                               </button>
                               <button 
                                 type="button"
                                 onClick={() => approveDocument(doc.id)}
                                 className="px-3 py-1 text-sm text-white bg-green-600 hover:bg-green-700 rounded shadow-sm"
                               >
                                 Approve
                               </button>
                             </div>
                           </CardContent>
                         </Card>
                    ))}
                </div>
             ) : (
                <div className="text-center py-12 text-muted-foreground">No documents under review.</div>
             )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

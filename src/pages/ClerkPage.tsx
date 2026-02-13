
import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { useBills, BillStatus } from "@/contexts/BillContext.tsx";
import { BillCard } from "@/components/BillCard.tsx";
import { BillFilter } from "@/components/BillFilter.tsx";
import { BillFormDialog } from "@/components/BillFormDialog.tsx";
import { DocumentManagement } from "@/components/DocumentManagement.tsx";
import { Navbar } from "@/components/Navbar.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { toast } from "@/components/ui/use-toast.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { LoadingScreen } from "@/components/LoadingScreen.tsx";
import { useBillList, useBillStats } from "@/hooks/useBillsQuery.ts";
import { PaginationControls } from "@/components/ui/pagination-controls.tsx";

const ClerkPage = () => {
  const { user, session, isClerk, isLoading } = useAuth();
  const { updateBillStatus, rescheduleBill } = useBills();

  // Local state for filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<BillStatus | "all">("all");
  const [committeeFilter, setCommitteeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // React Query Hooks
  const { data: billsData } = useBillList({
    status: statusFilter,
    search: searchTerm,
    page,
    pageSize
  });

  const { data: billStats } = useBillStats();

  useEffect(() => {
    // Reset page on filter change
    setPage(1);
  }, [searchTerm, statusFilter, committeeFilter]);

  // Show loading state while auth state is being determined
  if (isLoading) {
    return <LoadingScreen />;
  }

  // If no session at all, redirect to login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // If session exists but user profile not loaded yet, show loading
  if (session && !user) {
    return <LoadingScreen />;
  }

  // If user is authenticated but not a clerk, show access denied
  if (user && !isClerk) {
    toast({
      title: "Access denied",
      description: "You need clerk privileges to access this page",
      variant: "destructive"
    });
    return <Navigate to="/" replace />;
  }

  const handleStatusChangeAction = (id: string, status: BillStatus) => {
    updateBillStatus(id, status);
  };

  const handleReschedule = (id: string, newDate: Date) => {
    rescheduleBill(id, newDate);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status as BillStatus | "all");
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />

      <main className="container py-8">
        <div className="mb-8 text-center relative">
          <h1 className="text-3xl font-bold">Clerk Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage and track all legislative documents
          </p>
          <div className="absolute right-0 top-0">
          </div>
        </div>

        <Tabs defaultValue="bills" className="max-w-6xl mx-auto">
          <TabsList className="w-full justify-start overflow-x-auto h-auto flex-nowrap pb-1 no-scrollbar">
            <TabsTrigger value="bills" className="min-w-fit px-4">Bills</TabsTrigger>
            <TabsTrigger value="statements" className="min-w-fit px-4">Statements</TabsTrigger>
            <TabsTrigger value="reports" className="min-w-fit px-4">Reports</TabsTrigger>
            <TabsTrigger value="regulations" className="min-w-fit px-4">Regulations</TabsTrigger>
            <TabsTrigger value="policies" className="min-w-fit px-4">Policies</TabsTrigger>
            <TabsTrigger value="petitions" className="min-w-fit px-4">Petitions</TabsTrigger>
          </TabsList>

          <TabsContent value="bills" className="mt-6">
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{billStats?.total || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Pending Bills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {billStats?.pending || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Concluded Bills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {billStats?.concluded || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Add New Bill Button */}
              <div className="flex justify-end">
                <BillFormDialog />
              </div>

              {/* Filter Component */}
              <BillFilter 
                onSearchChange={setSearchTerm}
                onStatusChange={handleStatusFilterChange}
                onCommitteeChange={setCommitteeFilter}
              />

              {/* Bills Tabs */}
              <Tabs defaultValue="all" className="mt-6" onValueChange={(val) => setStatusFilter(val === "pending" ? "pending" : "all")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="all">All Bills</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-6">
                  {billsData && billsData.data.length > 0 ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        {billsData.data.map((bill) => (
                          <BillCard
                            key={bill.id}
                            bill={bill}
                            showActions
                            onStatusChange={handleStatusChangeAction}
                            onReschedule={handleReschedule}
                          />
                        ))}
                      </div>
                      <PaginationControls 
                         currentPage={page}
                         totalCount={billsData.count}
                         pageSize={pageSize}
                         onPageChange={setPage}
                       />
                    </>
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground mb-4">No bills found</p>
                        <BillFormDialog>
                          <button type="button" className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                            Create Your First Bill
                          </button>
                        </BillFormDialog>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="pending" className="mt-6">
                  {billsData && billsData.data.length > 0 ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        {billsData.data.map((bill) => (
                          <BillCard
                            key={bill.id}
                            bill={bill}
                            showActions
                            onStatusChange={handleStatusChangeAction}
                            onReschedule={handleReschedule}
                          />
                        ))}
                      </div>
                      <PaginationControls 
                         currentPage={page}
                         totalCount={billsData.count}
                         pageSize={pageSize}
                         onPageChange={setPage}
                       />
                    </>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No pending bills found</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="statements" className="mt-6">
            <DocumentManagement documentType="statement" title="Statements" />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <DocumentManagement documentType="report" title="Reports" />
          </TabsContent>

          <TabsContent value="regulations" className="mt-6">
            <DocumentManagement documentType="regulation" title="Regulations" />
          </TabsContent>

          <TabsContent value="policies" className="mt-6">
            <DocumentManagement documentType="policy" title="Policies" />
          </TabsContent>

          <TabsContent value="petitions" className="mt-6">
            <DocumentManagement documentType="petition" title="Petitions" />
          </TabsContent>


        </Tabs>
      </main>

      <footer className="bg-gray-100 py-4 mt-8">
        <div className="container text-center">
          <p className="text-sm text-gray-600">
            © 2025 All Rights Reserved By County Assembly of Makueni
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ClerkPage;

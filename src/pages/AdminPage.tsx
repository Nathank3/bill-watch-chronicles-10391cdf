
import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { useBills, Bill, BillStatus } from "@/contexts/BillContext.tsx";
import { BillCard } from "@/components/BillCard.tsx";
import { BillFilter } from "@/components/BillFilter.tsx";
import { BillFormDialog } from "@/components/BillFormDialog.tsx";
import { BulkUploadDialog } from "@/components/BulkUploadDialog.tsx";
import { DocumentManagement } from "@/components/DocumentManagement.tsx";
import { useDocuments } from "@/contexts/DocumentContext.tsx";
import { Navbar } from "@/components/Navbar.tsx";
import { AdminUsers } from "@/components/AdminUsers.tsx";
import { CommitteeManagement } from "@/components/CommitteeManagement.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "@/components/ui/use-toast.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { DataMigrationDialog } from "@/components/DataMigrationDialog.tsx";
import { DeleteAllDataDialog } from "@/components/DeleteAllDataDialog.tsx";
import { LoadingScreen } from "@/components/LoadingScreen.tsx";

const AdminPage = () => {
  const { user, session, isAdmin, isLoading } = useAuth();
  const { bills, updateBillStatus, rescheduleBill, underReviewBills, approveBill, rejectBill } = useBills();
  const { underReviewDocuments, approveDocument, rejectDocument } = useDocuments();
  const [filteredBills, setFilteredBills] = useState<Bill[]>([]);

  useEffect(() => {
    // Debug auth state - removed console logs
  }, [user, session, isAdmin, isLoading]);

  useEffect(() => {
    // Initialize filtered bills when bills are loaded
    if (bills) {
      setFilteredBills(bills);
    }
  }, [bills]);

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

  // If user is authenticated but not an admin, show access denied
  if (user && !isAdmin) {
    toast({
      title: "Access denied",
      description: "You need admin privileges to access this page",
      variant: "destructive"
    });
    return <Navigate to="/" replace />;
  }

  const handleStatusChange = (id: string, status: BillStatus) => {
    updateBillStatus(id, status);
  };

  const handleReschedule = (id: string, newDate: Date) => {
    rescheduleBill(id, newDate);
  };



  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <main className="container py-8">
        <div className="mb-8 text-center relative">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage and track all legislative documents
          </p>
          <div className="absolute right-0 top-0 flex gap-2">
            <BulkUploadDialog />
            <DataMigrationDialog />
            <DeleteAllDataDialog />
          </div>
        </div>
        
        <Tabs defaultValue="bills" className="max-w-6xl mx-auto">
          <TabsList className="w-full justify-start overflow-x-auto h-auto flex-nowrap pb-1 no-scrollbar">
            <TabsTrigger value="review" className="relative min-w-fit px-4">
              Review Queue
              {(underReviewBills.length > 0 || underReviewDocuments("statement").length > 0) && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="bills" className="min-w-fit px-4">Bills</TabsTrigger>
            <TabsTrigger value="statements" className="min-w-fit px-4">Statements</TabsTrigger>
            <TabsTrigger value="reports" className="min-w-fit px-4">Reports</TabsTrigger>
            <TabsTrigger value="regulations" className="min-w-fit px-4">Regulations</TabsTrigger>
            <TabsTrigger value="policies" className="min-w-fit px-4">Policies</TabsTrigger>
            <TabsTrigger value="petitions" className="min-w-fit px-4">Petitions</TabsTrigger>
            <TabsTrigger value="committees" className="min-w-fit px-4">Committees</TabsTrigger>
            <TabsTrigger value="users" className="min-w-fit px-4">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="review" className="mt-6">
             <div className="space-y-8">
               {/* Bills Review Section */}
               <section>
                 <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                   Bills Pending Review 
                   <span className="text-sm font-normal text-muted-foreground">({underReviewBills.length})</span>
                 </h2>
                 {underReviewBills.length > 0 ? (
                   <div className="grid gap-4 md:grid-cols-2">
                     {underReviewBills.map((bill) => (
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
                   <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed">
                     <p className="text-muted-foreground">No bills waiting for review</p>
                   </div>
                 )}
               </section>

               {/* Documents Review Section - Simplified to show all types for now */}
               {/* Ideally we iterate through all types, but let's start with Statements as a proof of concept as requested */}
               {/* Iterate common types */}
               {["statement", "report", "regulation", "policy", "petition"].map((type) => {
                 const docs = underReviewDocuments(type as DocumentType);
                 if (docs.length === 0) return null;
                 
                 return (
                   <section key={type}>
                     <h2 className="text-xl font-semibold mb-4 mt-8 capitalize flex items-center gap-2">
                       {type}s Pending Review
                       <span className="text-sm font-normal text-muted-foreground">({docs.length})</span>
                     </h2>
                     <div className="grid gap-4 md:grid-cols-2">
                       {docs.map((doc) => (
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
                   </section>
                 );
               })}
             </div>
          </TabsContent>
          
          <TabsContent value="bills" className="mt-6">
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{bills?.length || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Pending Bills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {bills?.filter(b => b.status === "pending").length || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Concluded Bills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {bills?.filter(b => b.status === "concluded").length || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Add New Bill Button */}
              <div className="flex justify-end">
                <BillFormDialog />
              </div>

              {/* Filter Component */}
              <BillFilter onFilterChange={setFilteredBills} />
              
              {/* Bills Tabs */}
              <Tabs defaultValue="all" className="mt-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="all">All Bills</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-6">
                  {filteredBills && filteredBills.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {filteredBills.map((bill) => (
                        <BillCard
                          key={bill.id}
                          bill={bill}
                          showActions
                          onStatusChange={handleStatusChange}
                          onReschedule={handleReschedule}
                        />
                      ))}
                    </div>
                  ) : bills && bills.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground mb-4">No bills have been created yet</p>
                        <BillFormDialog>
                          <button type="button" className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                            Create Your First Bill
                          </button>
                        </BillFormDialog>
                      </CardContent>
                    </Card>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No bills found matching your filters</p>
                  )}
                </TabsContent>
                
                <TabsContent value="pending" className="mt-6">
                  {filteredBills?.filter(b => b.status === "pending").length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {filteredBills
                        .filter(b => b.status === "pending")
                        .map((bill) => (
                          <BillCard
                            key={bill.id}
                            bill={bill}
                            showActions
                            onStatusChange={handleStatusChange}
                            onReschedule={handleReschedule}
                          />
                        ))}
                    </div>
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

          <TabsContent value="committees" className="mt-6">
            <CommitteeManagement />
          </TabsContent>
          
          <TabsContent value="users" className="mt-6">
            <AdminUsers />
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

export default AdminPage;


import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBills, Bill, BillStatus } from "@/contexts/BillContext";
import { BillCard } from "@/components/BillCard";
import { BillFilter } from "@/components/BillFilter";
import { BillFormDialog } from "@/components/BillFormDialog";
import { DocumentManagement } from "@/components/DocumentManagement";
import { Navbar } from "@/components/Navbar";
import { AdminUsers } from "@/components/AdminUsers";
import { CommitteeManagement } from "@/components/CommitteeManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AdminPage = () => {
  const { user, session, isAdmin, isLoading } = useAuth();
  const { bills, updateBillStatus, rescheduleBill } = useBills();
  const [filteredBills, setFilteredBills] = useState<Bill[]>([]);

  useEffect(() => {
    // Debug auth state
    console.log("AdminPage auth state:", { 
      user: !!user, 
      session: !!session, 
      isAdmin, 
      isLoading,
      userRole: user?.role
    });
  }, [user, session, isAdmin, isLoading]);

  useEffect(() => {
    // Initialize filtered bills when bills are loaded
    if (bills) {
      console.log("AdminPage: Bills loaded, count:", bills.length);
      setFilteredBills(bills);
    }
  }, [bills]);

  // Show loading state while auth state is being determined
  if (isLoading) {
    console.log("AdminPage: Still loading auth state");
    return (
      <div className="min-h-screen bg-secondary/30">
        <Navbar />
        <main className="container py-8">
          <div className="flex justify-center items-center h-64">
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </main>
      </div>
    );
  }

  // If no session at all, redirect to login
  if (!session) {
    console.log("AdminPage: No session found, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // If session exists but user profile not loaded yet, show loading
  if (session && !user) {
    console.log("AdminPage: Session exists but user profile not loaded");
    return (
      <div className="min-h-screen bg-secondary/30">
        <Navbar />
        <main className="container py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Loading user profile...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // If user is authenticated but not an admin, show access denied
  if (user && !isAdmin) {
    console.log("AdminPage: User authenticated but not admin, showing access denied");
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

  const handleReschedule = (id: string, additionalDays: number) => {
    rescheduleBill(id, additionalDays);
  };

  console.log("AdminPage: Rendering admin dashboard, filteredBills count:", filteredBills?.length || 0);

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <main className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage and track all legislative documents
          </p>
        </div>
        
        <Tabs defaultValue="bills" className="max-w-6xl mx-auto">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="bills">Bills</TabsTrigger>
            <TabsTrigger value="statements">Statements</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="regulations">Regulations</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="petitions">Petitions</TabsTrigger>
            <TabsTrigger value="committees">Committees</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
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
                          showActions={true}
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
                          <button className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
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
                            showActions={true}
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
    </div>
  );
};

export default AdminPage;

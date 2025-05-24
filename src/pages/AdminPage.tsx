
import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBills, Bill, BillStatus } from "@/contexts/BillContext";
import { BillCard } from "@/components/BillCard";
import { BillFilter } from "@/components/BillFilter";
import { Navbar } from "@/components/Navbar";
import { AdminUsers } from "@/components/AdminUsers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";

const AdminPage = () => {
  const { user, session, isAdmin, isLoading } = useAuth();
  const { updateBillStatus } = useBills();
  const [filteredBills, setFilteredBills] = useState<Bill[]>([]);

  useEffect(() => {
    // Debug auth state
    console.log("AdminPage auth state:", { 
      user: !!user, 
      session: !!session, 
      isAdmin, 
      isLoading 
    });
  }, [user, session, isAdmin, isLoading]);

  // Show loading state while auth state is being determined
  if (isLoading) {
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

  // If user is not authenticated or not an admin, redirect to login
  if (!isAdmin) {
    console.log("Not authenticated as admin, redirecting to login");
    toast({
      title: "Access denied",
      description: "You need admin privileges to access this page",
      variant: "destructive"
    });
    return <Navigate to="/login" />;
  }

  const handleStatusChange = (id: string, status: BillStatus) => {
    updateBillStatus(id, status);
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <main className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage and track all legislative bills
          </p>
        </div>
        
        <Tabs defaultValue="bills" className="max-w-5xl mx-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bills">Bills Management</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
          </TabsList>
          
          <TabsContent value="bills" className="mt-6">
            <BillFilter onFilterChange={setFilteredBills} />
            
            <Tabs defaultValue="all" className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="all">All Bills</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-6">
                {filteredBills.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredBills.map((bill) => (
                      <BillCard
                        key={bill.id}
                        bill={bill}
                        showActions={bill.status === "pending"}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No bills found matching your filters</p>
                )}
              </TabsContent>
              
              <TabsContent value="pending" className="mt-6">
                {filteredBills.filter(b => b.status === "pending").length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredBills
                      .filter(b => b.status === "pending")
                      .map((bill) => (
                        <BillCard
                          key={bill.id}
                          bill={bill}
                          showActions={true}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No pending bills found</p>
                )}
              </TabsContent>
            </Tabs>
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


import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBills, Bill } from "@/contexts/BillContext";
import { BillCard } from "@/components/BillCard";
import { BillForm } from "@/components/BillForm";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogHeader } from "@/components/ui/dialog";
import { isPast } from "date-fns";

const ClerkPage = () => {
  const { isClerk } = useAuth();
  const { pendingBills, updateBillStatus } = useBills();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  
  // If user is not a clerk, redirect to login
  if (!isClerk) {
    return <Navigate to="/login" />;
  }

  // Filter pending bills based on search query
  const filteredPendingBills = pendingBills.filter(bill =>
    bill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.committee.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
    setIsFormDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setEditingBill(null);
    setIsFormDialogOpen(false);
  };

  const handleStatusChange = (id: string, status: "pending" | "concluded") => {
    updateBillStatus(id, status);
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <main className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Clerk Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Add and manage pending legislative bills
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Actions</h2>
              <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full mb-4">Add New Bill</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingBill ? "Edit Bill" : "Add New Bill"}
                    </DialogTitle>
                  </DialogHeader>
                  <BillForm 
                    initialBill={editingBill || undefined} 
                    onSuccess={handleFormSuccess} 
                  />
                </DialogContent>
              </Dialog>
              
              <BillForm />
            </Card>
          </div>
          
          <div className="md:col-span-2">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Manage Pending Bills</h2>
                <Input
                  placeholder="Search bills"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-xs"
                />
              </div>
              
              <Tabs defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">All Pending</TabsTrigger>
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="past">Past Deadline</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-4">
                  {filteredPendingBills.length > 0 ? (
                    <div className="space-y-4">
                      {filteredPendingBills.map((bill) => (
                        <div key={bill.id} className="flex items-center gap-4">
                          <div className="flex-1">
                            <BillCard 
                              bill={bill} 
                              showActions={isPast(bill.presentationDate)} 
                              onStatusChange={handleStatusChange}
                            />
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => handleEditBill(bill)}
                          >
                            Edit
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">
                      {searchQuery ? "No bills match your search" : "No pending bills at this time"}
                    </p>
                  )}
                </TabsContent>
                
                <TabsContent value="upcoming" className="mt-4">
                  {filteredPendingBills.filter(bill => !isPast(bill.presentationDate)).length > 0 ? (
                    <div className="space-y-4">
                      {filteredPendingBills
                        .filter(bill => !isPast(bill.presentationDate))
                        .map((bill) => (
                          <div key={bill.id} className="flex items-center gap-4">
                            <div className="flex-1">
                              <BillCard bill={bill} />
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => handleEditBill(bill)}
                            >
                              Edit
                            </Button>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">
                      No upcoming bills found
                    </p>
                  )}
                </TabsContent>
                
                <TabsContent value="past" className="mt-4">
                  {filteredPendingBills.filter(bill => isPast(bill.presentationDate)).length > 0 ? (
                    <div className="space-y-4">
                      {filteredPendingBills
                        .filter(bill => isPast(bill.presentationDate))
                        .map((bill) => (
                          <div key={bill.id} className="flex items-center gap-4">
                            <div className="flex-1">
                              <BillCard 
                                bill={bill} 
                                showActions={true}
                                onStatusChange={handleStatusChange}
                              />
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => handleEditBill(bill)}
                            >
                              Edit
                            </Button>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">
                      No bills past deadline
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClerkPage;

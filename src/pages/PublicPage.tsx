
import React, { useState } from "react";
import { useBills } from "@/contexts/BillContext";
import { BillCard } from "@/components/BillCard";
import { Navbar } from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

const PublicPage = () => {
  const { pendingBills, passedBills, rejectedBills } = useBills();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter bills based on search query
  const filteredPendingBills = pendingBills.filter(bill =>
    bill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.mca.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPassedBills = passedBills.filter(bill =>
    bill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.mca.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRejectedBills = rejectedBills.filter(bill =>
    bill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.mca.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <main className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Legislative Bill Tracker</h1>
          <p className="text-muted-foreground mt-2">
            Track pending bills and view passed/rejected legislation
          </p>
        </div>
        
        <div className="mb-6">
          <Input
            placeholder="Search bills by title, MCA, or department"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xl mx-auto"
          />
        </div>

        <Tabs defaultValue="pending" className="max-w-5xl mx-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">Pending Bills</TabsTrigger>
            <TabsTrigger value="passed">Passed Bills</TabsTrigger>
            <TabsTrigger value="rejected">Rejected Bills</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="mt-6">
            {filteredPendingBills.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredPendingBills.map((bill) => (
                  <BillCard key={bill.id} bill={bill} />
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No pending bills match your search" : "No pending bills at this time"}
              </p>
            )}
          </TabsContent>
          
          <TabsContent value="passed" className="mt-6">
            {filteredPassedBills.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredPassedBills.map((bill) => (
                  <BillCard key={bill.id} bill={bill} />
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No passed bills match your search" : "No passed bills at this time"}
              </p>
            )}
          </TabsContent>
          
          <TabsContent value="rejected" className="mt-6">
            {filteredRejectedBills.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredRejectedBills.map((bill) => (
                  <BillCard key={bill.id} bill={bill} />
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No rejected bills match your search" : "No rejected bills at this time"}
              </p>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PublicPage;

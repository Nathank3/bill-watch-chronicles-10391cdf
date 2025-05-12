
import React, { useState } from "react";
import { useBills } from "@/contexts/BillContext";
import { BillCard } from "@/components/BillCard";
import { Navbar } from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

const PublicPage = () => {
  const { pendingBills, concludedBills } = useBills();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter bills based on search query
  const filteredPendingBills = pendingBills.filter(bill =>
    bill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.committee.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredConcludedBills = concludedBills.filter(bill =>
    bill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.committee.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <main className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Legislative Bill Tracker</h1>
          <p className="text-muted-foreground mt-2">
            Track pending bills and view concluded legislation
          </p>
        </div>
        
        <div className="mb-6">
          <Input
            placeholder="Search bills by title or committee"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xl mx-auto"
          />
        </div>

        <Tabs defaultValue="pending" className="max-w-5xl mx-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">Pending Bills</TabsTrigger>
            <TabsTrigger value="concluded">Concluded Bills</TabsTrigger>
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
          
          <TabsContent value="concluded" className="mt-6">
            {filteredConcludedBills.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredConcludedBills.map((bill) => (
                  <BillCard key={bill.id} bill={bill} />
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No concluded bills match your search" : "No concluded bills at this time"}
              </p>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PublicPage;

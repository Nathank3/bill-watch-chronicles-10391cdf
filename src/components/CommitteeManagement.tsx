import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Label } from "@/components/ui/label.tsx";
import { toast } from "@/components/ui/use-toast.ts";
import { Trash2, Edit3, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";

interface Committee {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export const CommitteeManagement = () => {
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommitteeName, setNewCommitteeName] = useState("");
  const [editingCommittee, setEditingCommittee] = useState<Committee | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchCommittees();
  }, []);

  const fetchCommittees = async () => {
    try {
      const { data, error } = await supabase
        .from("committees")
        .select("*")
        .order("name");

      if (error) throw error;
      setCommittees(data || []);
    } catch (error) {
      console.error("Error fetching committees:", error);
      toast({
        title: "Error",
        description: "Failed to load committees",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCommittee = async () => {
    if (!newCommitteeName.trim()) {
      toast({
        title: "Validation Error",
        description: "Committee name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("committees")
        .insert([{ name: newCommitteeName.trim() }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Committee added successfully"
      });

      setNewCommitteeName("");
      setIsDialogOpen(false);
      fetchCommittees();
    } catch (error) {
      console.error("Error adding committee:", error);
      toast({
        title: "Error",
        description: "Failed to add committee",
        variant: "destructive"
      });
    }
  };

  const handleUpdateCommittee = async () => {
    if (!editingCommittee || !editingCommittee.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Committee name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const oldName = committees.find(c => c.id === editingCommittee.id)?.name;
      const newName = editingCommittee.name.trim();

      // 1. Update Committee Name in Registry
      const { error } = await supabase
        .from("committees")
        .update({ name: newName })
        .eq("id", editingCommittee.id);

      if (error) throw error;

      // 2. Smart Rename: Update Pending/Active Items Only
      // We do NOT update concluded items to preserve history.
      if (oldName && oldName !== newName) {
         // Update Bills (Pending/Overdue/Frozen/UnderReview/Limbo)
         await supabase.from("bills")
            .update({ committee: newName })
            .eq("committee", oldName)
            .neq("status", "concluded");

         // Update Documents (Pending/Overdue/Frozen/UnderReview/Limbo)
         await supabase.from("documents")
            .update({ committee: newName })
            .eq("committee", oldName)
            .neq("status", "concluded");
            
         toast({
            title: "Smart Rename Applied",
            description: "Active business items have been moved to the new committee name. Concluded items remain unchanged."
         });
      } else {
         toast({
            title: "Success",
            description: "Committee updated successfully"
         });
      }

      setEditingCommittee(null);
      fetchCommittees();
    } catch (error) {
      console.error("Error updating committee:", error);
      toast({
        title: "Error",
        description: "Failed to update committee",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCommittee = async (id: string) => {
    if (!confirm("Are you sure you want to delete this committee?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("committees")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Committee deleted successfully"
      });

      fetchCommittees();
    } catch (error) {
      console.error("Error deleting committee:", error);
      toast({
        title: "Error",
        description: "Failed to delete committee",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading committees...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Committee Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Committee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Committee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="committee-name">Committee Name</Label>
                <Input
                  id="committee-name"
                  value={newCommitteeName}
                  onChange={(e) => setNewCommitteeName(e.target.value)}
                  placeholder="Enter committee name"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddCommittee} className="flex-1">
                  Add Committee
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setNewCommitteeName("");
                    setIsDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {committees.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No committees created yet</p>
            </CardContent>
          </Card>
        ) : (
          committees.map((committee) => (
            <Card key={committee.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  {editingCommittee?.id === committee.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editingCommittee.name}
                        onChange={(e) =>
                          setEditingCommittee({
                            ...editingCommittee,
                            name: e.target.value
                          })
                        }
                        className="flex-1"
                      />
                      <Button size="sm" onClick={handleUpdateCommittee}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingCommittee(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="font-medium">{committee.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Created: {new Date(committee.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingCommittee(committee)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteCommittee(committee.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
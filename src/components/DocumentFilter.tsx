
import React, { useState, useEffect } from "react";
import { useDocuments, Document } from "@/contexts/DocumentContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DocumentFilterProps {
    documents: Document[];
    onFilterChange: (filteredDocs: Document[]) => void;
    title: string;
}

export const DocumentFilter = ({ documents, onFilterChange, title }: DocumentFilterProps) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [committeeFilter, setCommitteeFilter] = useState("all");

    useEffect(() => {
        if (!documents) {
            onFilterChange([]);
            return;
        }

        let filtered = [...documents];

        // Filter by search term
        if (searchTerm.trim()) {
            filtered = filtered.filter(doc =>
                doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.committee?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter by status
        if (statusFilter !== "all") {
            filtered = filtered.filter(doc => doc.status === statusFilter);
        }

        // Filter by committee
        if (committeeFilter !== "all") {
            filtered = filtered.filter(doc => doc.committee === committeeFilter);
        }

        onFilterChange(filtered);
    }, [documents, searchTerm, statusFilter, committeeFilter]);

    // Get unique committees for filter
    const committees = documents ? [...new Set(documents.map(doc => doc.committee).filter(Boolean))].sort() : [];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Filter {title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Input
                        placeholder={`Search ${title.toLowerCase()} by title or committee...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="concluded">Concluded</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
                                <SelectItem value="frozen">Frozen</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Select value={committeeFilter} onValueChange={setCommitteeFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by committee" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                                <SelectItem value="all">All Committees</SelectItem>
                                {committees.map(committee => (
                                    <SelectItem key={committee} value={committee}>{committee}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

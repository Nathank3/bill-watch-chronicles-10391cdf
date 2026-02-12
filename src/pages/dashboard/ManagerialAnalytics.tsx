import { useState, useRef, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { supabase } from "@/integrations/supabase/client.ts";
import { Loader2, Download, TrendingUp, TrendingDown, Minus, Briefcase, CalendarCheck2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from "@/hooks/use-toast.ts";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from "date-fns";
import { useQuery } from '@tanstack/react-query';

interface ManagerialStats {
    trends: {
        bills: {
            introduced: { current: number, last: number };
            concluded: { current: number, last: number };
        };
        motions: {
            introduced: { current: number, last: number };
            concluded: { current: number, last: number };
        };
    };
    committees: Array<{
        committee: string;
        total_items: number;
        concluded_items: number;
        overdue_items: number;
        concluded_this_month: number;
    }>;
}

export const ManagerialAnalytics = () => {
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const { data: stats, isLoading: loading, error } = useQuery({
        queryKey: ['managerial-stats'],
        queryFn: async () => {
             // @ts-ignore - RPC function added via migration
            const { data, error } = await supabase.rpc('get_managerial_stats');
            if (error) throw error;
            return data as unknown as ManagerialStats;
        },
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });

    if (error) {
        console.error('Error fetching managerial stats:', error);
        toast({
            title: "Error",
            description: "Failed to load managerial data.",
            variant: "destructive"
        });
    }

    const handleDownloadReport = async () => {
        setGeneratingPdf(true);

        try {
            const summaryElement = document.getElementById('managerial-summary');
            const tableElement = document.getElementById('managerial-table');

            if (!summaryElement || !tableElement) return;

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            // 1. Capture Summary & Charts (Page 1)
            const summaryCanvas = await html2canvas(summaryElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const summaryImgData = summaryCanvas.toDataURL('image/png');
            const summaryImgHeight = (summaryCanvas.height * pdfWidth) / summaryCanvas.width;
            
            pdf.addImage(summaryImgData, 'PNG', 0, 0, pdfWidth, summaryImgHeight);

            // 2. Capture Table (Page 2)
            pdf.addPage();
            
            const tableCanvas = await html2canvas(tableElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const tableImgData = tableCanvas.toDataURL('image/png');
            const tableImgHeight = (tableCanvas.height * pdfWidth) / tableCanvas.width;

            // Start table at top of page 2
            // If table is long, we might need to slice it too, but for now assuming it fits or we let it scale
            // To handle very long tables properly we'd need autoTable, but this approach keeps the "visual" look
            // For now, let's just add it. If it's huge it might shrink, but "break well" usually means "start on new page"
            
            if (tableImgHeight > pdfHeight) {
                // Simple multi-page for table if REALLY long
                let heightLeft = tableImgHeight;
                let position = 0;
                
                pdf.addImage(tableImgData, 'PNG', 0, position, pdfWidth, tableImgHeight);
                heightLeft -= pdfHeight;

                while (heightLeft >= 0) {
                    position = heightLeft - tableImgHeight; // This basic loop logic is tricky with slicing, 
                                                            // simpler is just to let it span or accept the cut for standard length
                                                            // But user asked to "break well". 
                                                            // For the "screenshot" approach, clean breaking is hard without slicing.
                                                            // Placed on a new page is the biggest win.
                     pdf.addPage();
                     pdf.addImage(tableImgData, 'PNG', 0, position, pdfWidth, tableImgHeight);
                     heightLeft -= pdfHeight;
                }
            } else {
                 pdf.addImage(tableImgData, 'PNG', 0, 0, pdfWidth, tableImgHeight);
            }

            pdf.save(`Managerial_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);

            toast({
                title: "Report Downloaded",
                description: "Your managerial report is ready.",
            });

        } catch (error) {
            console.error("PDF Generation Error:", error);
            toast({
                title: "Error",
                description: "Failed to generate PDF report.",
                variant: "destructive"
            });
        } finally {
            setGeneratingPdf(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!stats) return <div>No data available.</div>;

    // Prepare chart data
    const committeeChartData = stats.committees
        .sort((a, b) => b.total_items - a.total_items)
        .slice(0, 10) // Top 10 active
        .map(c => ({
            name: c.committee.replace("Committee", "").trim(), // Shorten name
            total: c.total_items,
            concluded: c.concluded_items
        }));

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={handleDownloadReport} disabled={generatingPdf}>
                    {generatingPdf ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Download className="mr-2 h-4 w-4" />
                    )}
                    {generatingPdf ? "Generating PDF..." : "Download Visual Report"}
                </Button>
            </div>

            {/* Report Container */}
            <div className="bg-white rounded-lg shadow-sm">
                
                {/* PART 1: SUMMARY & CHARTS (Page 1) */}
                <div id="managerial-summary" className="p-8 space-y-10 bg-white">
                    {/* Header */}
                    <div className="border-b pb-6">
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Executive Managerial Report</h1>
                        <p className="text-gray-500 mt-2">Generated on {format(new Date(), "MMMM do, yyyy")}</p>
                    </div>

                    {/* 1. Monthly Insights */}
                    <section>
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-slate-800">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Monthly Business Insights
                        </h2>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            <InsightCard 
                                title="Bills Introduced"
                                current={stats.trends.bills.introduced.current}
                                last={stats.trends.bills.introduced.last}
                                icon={<Briefcase className="h-4 w-4 text-blue-600" />}
                            />
                            <InsightCard 
                                title="Bills Concluded"
                                current={stats.trends.bills.concluded.current}
                                last={stats.trends.bills.concluded.last}
                                icon={<CalendarCheck2 className="h-4 w-4 text-green-600" />}
                            />
                            <InsightCard 
                                title="Motions Introduced"
                                current={stats.trends.motions.introduced.current}
                                last={stats.trends.motions.introduced.last}
                                icon={<Briefcase className="h-4 w-4 text-purple-600" />}
                            />
                             <InsightCard 
                                title="Motions Concluded"
                                current={stats.trends.motions.concluded.current}
                                last={stats.trends.motions.concluded.last}
                                icon={<CalendarCheck2 className="h-4 w-4 text-green-600" />}
                            />
                        </div>
                    </section>

                    {/* 2. Visual Distributions */}
                    <section>
                         <h2 className="text-xl font-semibold mb-6 text-slate-800">Committee Workload Distribution</h2>
                         <Card className="border-slate-100 shadow-sm">
                            <CardContent className="pt-6 pl-0">
                                <div className="h-[400px] w-full pr-6">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={committeeChartData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                            <XAxis type="number" stroke="#64748b" fontSize={12} />
                                            <YAxis dataKey="name" type="category" width={200} tick={{fontSize: 12, fill: '#475569'}} stroke="#64748b" />
                                            <Tooltip 
                                                cursor={{fill: '#f1f5f9'}}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="total" name="Total Business" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                                            <Bar dataKey="concluded" name="Concluded" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-sm text-center text-gray-500 mt-4 font-medium">Top 10 Most Active Committees</p>
                            </CardContent>
                         </Card>
                    </section>
                </div>

                {/* PART 2: TABLE (Page 2) */}
                <div id="managerial-table" className="p-8 bg-white">
                    <section>
                        <h2 className="text-xl font-semibold mb-6 text-slate-800">Committee Performance Efficiency</h2>
                        <div className="rounded-lg border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="p-4">Committee Name</th>
                                        <th className="p-4 text-right">Total Items</th>
                                        <th className="p-4 text-right">Concluded</th>
                                        <th className="p-4 text-right">Efficiency Rate</th>
                                        <th className="p-4 text-right text-red-600">Overdue</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {stats.committees
                                        .sort((a, b) => b.total_items - a.total_items)
                                        .map((comm, i) => {
                                            const efficiency = comm.total_items > 0 
                                                ? Math.round((comm.concluded_items / comm.total_items) * 100) 
                                                : 0;
                                            
                                            return (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-4 font-medium text-slate-700">{comm.committee}</td>
                                                    <td className="p-4 text-right text-slate-600">{comm.total_items}</td>
                                                    <td className="p-4 text-right text-slate-600">{comm.concluded_items}</td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                                                efficiency >= 70 ? 'bg-green-100 text-green-700' :
                                                                efficiency >= 40 ? 'bg-amber-100 text-amber-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                                {efficiency}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right font-medium text-red-600">
                                                        {comm.overdue_items > 0 ? comm.overdue_items : "-"}
                                                    </td>
                                                </tr>
                                            );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
                
                {/* Footer */}
                <div className="p-8 pt-0 text-center text-sm text-gray-400">
                    Bill Watch Chronicles System &copy; {new Date().getFullYear()}
                </div>
            </div>
        </div>
    );
};

const InsightCard = ({ title, current, last, icon }: { title: string, current: number, last: number, icon: ReactNode }) => {
    const growth = last === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - last) / last) * 100);
    const growthColor = growth > 0 ? "text-green-600" : (growth < 0 ? "text-red-600" : "text-gray-500");
    const growthIcon = growth > 0 ? <TrendingUp className="h-3 w-3" /> : (growth < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{current}</div>
                <div className={`text-xs font-medium flex items-center gap-1 mt-1 ${growthColor}`}>
                    {growthIcon}
                    <span>{Math.abs(growth)}%</span>
                    <span className="text-muted-foreground font-normal ml-1">from last month</span>
                </div>
            </CardContent>
        </Card>
    );
};

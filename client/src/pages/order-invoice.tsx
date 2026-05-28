import { useRef, useState, useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import TaxInvoice, { InvoiceData } from '@/components/TaxInvoice';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Download, FileText, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function OrderInvoicePage() {
  const [, params] = useRoute('/order/:orderId/invoice');
  const orderId = params?.orderId;
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isGeneratingEway, setIsGeneratingEway] = useState(false);

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['/api/orders', orderId],
    enabled: !!orderId,
  });

  const { data: invoiceData, isLoading: invoiceLoading } = useQuery<InvoiceData>({
    queryKey: ['/api/orders', orderId, 'invoice'],
    enabled: !!orderId,
  });

  const handlePrint = () => {
    if (invoiceRef.current) {
      const printContents = invoiceRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Tax Invoice - ${invoiceData?.invoiceNo || 'Invoice'}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  margin: 0; 
                  padding: 20px;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                @media print {
                  body { padding: 0; }
                }
                table { border-collapse: collapse; }
                .bg-gray-100 { background-color: #f3f4f6; }
                .bg-gray-50 { background-color: #f9fafb; }
                .bg-blue-100 { background-color: #dbeafe; }
                .text-blue-800 { color: #1e40af; }
                .font-bold { font-weight: bold; }
                .font-semibold { font-weight: 600; }
                .font-medium { font-weight: 500; }
                .text-xs { font-size: 0.75rem; }
                .text-sm { font-size: 0.875rem; }
                .text-base { font-size: 1rem; }
                .text-xl { font-size: 1.25rem; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .text-left { text-align: left; }
                .text-gray-500 { color: #6b7280; }
                .text-gray-600 { color: #4b5563; }
                .text-gray-700 { color: #374151; }
                .border { border: 1px solid #000; }
                .border-b { border-bottom: 1px solid #000; }
                .border-r { border-right: 1px solid #000; }
                .border-t { border-top: 1px solid #000; }
                .border-t-2 { border-top: 2px solid #000; }
                .border-b-2 { border-bottom: 2px solid #000; }
                .border-black { border-color: #000; }
                .border-gray-300 { border-color: #d1d5db; }
                .border-gray-400 { border-color: #9ca3af; }
                .p-1 { padding: 0.25rem; }
                .p-2 { padding: 0.5rem; }
                .p-3 { padding: 0.75rem; }
                .p-6 { padding: 1.5rem; }
                .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
                .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
                .pb-2 { padding-bottom: 0.5rem; }
                .pt-2 { padding-top: 0.5rem; }
                .mb-1 { margin-bottom: 0.25rem; }
                .mb-2 { margin-bottom: 0.5rem; }
                .mb-4 { margin-bottom: 1rem; }
                .mb-8 { margin-bottom: 2rem; }
                .mt-4 { margin-top: 1rem; }
                .grid { display: grid; }
                .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
                .gap-4 { gap: 1rem; }
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .items-center { align-items: center; }
                .max-w-4xl { max-width: 56rem; }
                .mx-auto { margin-left: auto; margin-right: auto; }
                .w-full { width: 100%; }
                .rounded { border-radius: 0.25rem; }
                .p-1\\.5 { padding: 0.375rem; }
                .break-all { word-break: break-all; }
                .whitespace-pre-line { white-space: pre-line; }
                .inline-block { display: inline-block; }
                .align-top { vertical-align: top; }
                .border-collapse { border-collapse: collapse; }
              </style>
            </head>
            <body>${printContents}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  const handleDownloadPDF = async () => {
    toast({
      title: 'Downloading PDF',
      description: 'Preparing your invoice PDF...',
    });
    
    try {
      const response = await fetch(`/api/orders/${orderId}/invoice/pdf`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoiceData?.invoiceNo || orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Success',
        description: 'Invoice PDF downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Print to PDF',
        description: 'Use the Print button and select "Save as PDF"',
      });
      handlePrint();
    }
  };

  const handleGenerateEwayBill = async () => {
    if (!invoiceData) return;
    
    setIsGeneratingEway(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/generate-eway-bill`, {
        method: 'POST',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'E-way Bill Generated',
          description: `E-way Bill No: ${data.ewayBillNo}`,
        });
        window.location.reload();
      } else if (data.redirect) {
        window.location.href = data.redirect;
      } else {
        toast({
          title: 'Note',
          description: data.message || 'E-way Bill generation requires amount > ₹50,000',
          variant: 'default',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate E-way Bill',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingEway(false);
    }
  };

  if (orderLoading || invoiceLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-3 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse bg-white rounded-lg shadow p-4 sm:p-8">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="min-h-screen bg-gray-100 p-3 sm:p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">Invoice Not Found</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-4">The invoice for this order could not be generated.</p>
          <Link href="/">
            <Button className="min-h-11"><ArrowLeft className="mr-2 h-4 w-4" /> Go Back</Button>
          </Link>
        </div>
      </div>
    );
  }

  const showEwayButton = invoiceData.grandTotal >= 50000 && !invoiceData.ewayBillNo;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
          <Link href="/orders">
            <Button variant="ghost" size="sm" className="min-h-11 sm:min-h-9 px-2 sm:px-3">
              <ArrowLeft className="mr-1 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Back to Orders</span><span className="sm:hidden">Back</span>
            </Button>
          </Link>
          
          <div className="flex items-center gap-1 sm:gap-2">
            {showEwayButton && (
              <Button 
                variant="outline" 
                size="sm" 
                className="min-h-11 sm:min-h-9 px-2 sm:px-3 text-xs sm:text-sm"
                onClick={handleGenerateEwayBill}
                disabled={isGeneratingEway}
              >
                <Truck className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">{isGeneratingEway ? 'Generating...' : 'Generate E-way Bill'}</span>
                <span className="sm:hidden">{isGeneratingEway ? '...' : 'E-way'}</span>
              </Button>
            )}
            <Button variant="outline" size="sm" className="min-h-11 sm:min-h-9 px-2 sm:px-3" onClick={handlePrint}>
              <Printer className="mr-1 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Print</span>
            </Button>
            <Button size="sm" className="min-h-11 sm:min-h-9 px-2 sm:px-3" onClick={handleDownloadPDF}>
              <Download className="mr-1 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Download PDF</span><span className="sm:hidden">PDF</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-8">
        <div className="bg-white shadow-lg rounded-lg overflow-x-auto">
          <TaxInvoice ref={invoiceRef} data={invoiceData} />
        </div>
      </div>
    </div>
  );
}

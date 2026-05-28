import { forwardRef } from 'react';

interface InvoiceItem {
  slNo: number;
  description: string;
  hsnCode: string;
  gstRate: number;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

interface TaxBreakdown {
  hsnCode?: string;
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate?: number;
  igstAmount?: number;
  totalTax: number;
}

interface InvoiceData {
  invoiceNo: string;
  invoiceDate: string;
  ewayBillNo?: string | null;
  deliveryNoteNo?: string | null;
  deliveryNoteDate?: string | null;
  dispatchDocNo?: string | null;
  vehicleNo?: string | null;
  placeOfSupply?: string;
  irnNo?: string | null;
  ackNo?: string | null;
  ackDate?: string | null;
  dispatchedThrough?: string | null;
  billOfLading?: string | null;
  termsOfPayment?: string | null;
  termsOfDelivery?: string | null;
  buyerOrderNo?: string | null;
  seller: {
    name: string;
    address: string;
    fssaiNo?: string;
    gstin: string;
    stateCode: string;
    stateName: string;
  };
  buyer: {
    name: string;
    address: string;
    gstin?: string | null;
    fssaiNo?: string | null;
    stateCode: string;
    stateName: string;
  };
  consignee?: {
    name: string;
    address: string;
    gstin?: string | null;
    fssaiNo?: string | null;
    stateCode: string;
    stateName: string;
  };
  items: InvoiceItem[];
  taxBreakdown: TaxBreakdown[];
  subtotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst?: number;
  roundingOff: number;
  grandTotal: number;
}

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  
  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
  };

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = Math.floor(num % 1000);
  const paise = Math.round((num % 1) * 100);

  let result = '';
  if (crore) result += convertLessThanThousand(crore) + ' Crore ';
  if (lakh) result += convertLessThanThousand(lakh) + ' Lakh ';
  if (thousand) result += convertLessThanThousand(thousand) + ' Thousand ';
  if (remainder) result += convertLessThanThousand(remainder);
  
  result = result.trim();
  
  if (paise > 0) {
    result += ' and ' + convertLessThanThousand(paise) + ' paise';
  }
  
  return result + ' Only';
}

const TaxInvoice = forwardRef<HTMLDivElement, { data: InvoiceData }>(({ data }, ref) => {
  const fmt = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
  const bdr = 'border border-black';
  const bdrR = 'border-r border-black';
  const bdrB = 'border-b border-black';
  const cell = 'px-2 py-1 text-[11px]';

  return (
    <div ref={ref} className="bg-white max-w-4xl mx-auto" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#000' }}>
      <div className={bdr}>
        {/* ===== HEADER: Tax Invoice + e-Invoice ===== */}
        <div className={`flex justify-between items-start ${bdrB} px-3 py-2`}>
          <div className="flex-1">
            <h1 className="text-center text-base font-bold tracking-wide">Tax Invoice</h1>
          </div>
          {data.irnNo && (
            <div className="text-right">
              <span className="font-bold text-[11px]">e-Invoice</span>
            </div>
          )}
        </div>

        {/* ===== IRN / Ack Row ===== */}
        {data.irnNo && (
          <div className={`${bdrB} px-2 py-1`}>
            <table className="w-full text-[10px]">
              <tbody>
                <tr>
                  <td className="font-bold w-[50px]">IRN</td>
                  <td className="px-1">:</td>
                  <td className="break-all">{data.irnNo}</td>
                </tr>
                <tr>
                  <td className="font-bold">Ack No.</td>
                  <td className="px-1">:</td>
                  <td>{data.ackNo || ''}</td>
                </tr>
                <tr>
                  <td className="font-bold">Ack Date</td>
                  <td className="px-1">:</td>
                  <td>{data.ackDate || ''}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ===== UNIFIED 2-COLUMN: Seller/Consignee/Buyer (left) + Invoice Details (right) ===== */}
        <div className={`${bdrB}`}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              {/* ---- ROW: Seller info (left) | Invoice No / e-Way Bill / Dated headers (right) ---- */}
              <tr>
                <td className={`${bdrR} p-2 align-top`} rowSpan={6} style={{ width: '50%' }}>
                  <p className="font-bold text-[12px] leading-tight">{data.seller.name}</p>
                  <p className="whitespace-pre-line leading-tight mt-0.5">{data.seller.address}</p>
                  {data.seller.fssaiNo && (
                    <p className="mt-0.5"><span className="font-bold">FSSAI Licence No:</span>{data.seller.fssaiNo}</p>
                  )}
                  <p><span className="font-bold">GSTIN/UIN:</span> {data.seller.gstin}</p>
                  <p><span className="font-bold">State Name :</span> {data.seller.stateName}, Code : {data.seller.stateCode}</p>
                </td>
                <td className={`${cell} ${bdrR} ${bdrB} font-bold`} style={{ width: '17%' }}>Invoice No.</td>
                <td className={`${cell} ${bdrR} ${bdrB} font-bold`} style={{ width: '17%' }}>e-Way Bill No.</td>
                <td className={`${cell} ${bdrB} font-bold`} style={{ width: '16%' }}>Dated</td>
              </tr>
              <tr>
                <td className={`${cell} ${bdrR} ${bdrB} break-all`} style={{ wordBreak: 'break-word' }}>{data.invoiceNo}</td>
                <td className={`${cell} ${bdrR} ${bdrB}`}>{data.ewayBillNo || ''}</td>
                <td className={`${cell} ${bdrB}`}>{formatDate(data.invoiceDate)}</td>
              </tr>
              <tr>
                <td className={`${cell} ${bdrR} ${bdrB} font-bold`}>Delivery Note</td>
                <td colSpan={2} className={`${cell} ${bdrB} font-bold`}>Mode/Terms of Payment</td>
              </tr>
              <tr>
                <td className={`${cell} ${bdrR} ${bdrB}`}>{data.deliveryNoteNo || ''}</td>
                <td colSpan={2} className={`${cell} ${bdrB}`}>{data.termsOfPayment || ''}</td>
              </tr>
              <tr>
                <td className={`${cell} ${bdrR} ${bdrB} font-bold`}>Reference No. & Date.</td>
                <td colSpan={2} className={`${cell} ${bdrB} font-bold`}>Other References</td>
              </tr>
              <tr>
                <td className={`${cell} ${bdrR} ${bdrB}`}></td>
                <td colSpan={2} className={`${cell} ${bdrB}`}></td>
              </tr>

              {/* ---- ROW: Consignee (left) | Buyer's Order / Dispatch Doc / Dispatched through (right) ---- */}
              <tr>
                <td className={`${bdrR} p-2 align-top ${bdrB}`} rowSpan={6}>
                  <p className="font-bold text-[10px] mb-0.5">Consignee (Ship to)</p>
                  <p className="font-bold text-[12px]">{data.consignee?.name || data.buyer.name}</p>
                  <p className="whitespace-pre-line leading-tight">{data.consignee?.address || data.buyer.address}</p>
                  {(data.consignee?.gstin || data.buyer.gstin) && (
                    <p><span className="font-bold">GSTIN/UIN</span> : {data.consignee?.gstin || data.buyer.gstin}</p>
                  )}
                  <p><span className="font-bold">State Name</span> : {data.consignee?.stateName || data.buyer.stateName}, Code : {data.consignee?.stateCode || data.buyer.stateCode}</p>
                </td>
                <td className={`${cell} ${bdrR} ${bdrB} font-bold`}>Buyer's Order No.</td>
                <td colSpan={2} className={`${cell} ${bdrB} font-bold`}>Dated</td>
              </tr>
              <tr>
                <td className={`${cell} ${bdrR} ${bdrB}`}>{data.buyerOrderNo || ''}</td>
                <td colSpan={2} className={`${cell} ${bdrB}`}></td>
              </tr>
              <tr>
                <td className={`${cell} ${bdrR} ${bdrB} font-bold`}>Dispatch Doc No.</td>
                <td colSpan={2} className={`${cell} ${bdrB} font-bold`}>Delivery Note Date</td>
              </tr>
              <tr>
                <td className={`${cell} ${bdrR} ${bdrB}`}>{data.dispatchDocNo || ''}</td>
                <td colSpan={2} className={`${cell} ${bdrB}`}>{data.deliveryNoteDate ? formatDate(data.deliveryNoteDate) : ''}</td>
              </tr>
              <tr>
                <td className={`${cell} ${bdrR} ${bdrB} font-bold`}>Dispatched through</td>
                <td colSpan={2} className={`${cell} ${bdrB} font-bold`}>Destination</td>
              </tr>
              <tr>
                <td className={`${cell} ${bdrR} ${bdrB}`}>{data.dispatchedThrough || ''}</td>
                <td colSpan={2} className={`${cell} ${bdrB}`}>{data.placeOfSupply || ''}</td>
              </tr>

              {/* ---- ROW: Buyer (left) | Bill of Lading / Motor Vehicle / Terms of Delivery (right) ---- */}
              <tr>
                <td className={`${bdrR} p-2 align-top`} rowSpan={4}>
                  <p className="font-bold text-[10px] mb-0.5">Buyer (Bill to)</p>
                  <p className="font-bold text-[12px]">{data.buyer.name}</p>
                  <p className="whitespace-pre-line leading-tight">{data.buyer.address}</p>
                  {data.buyer.gstin && (
                    <p><span className="font-bold">GSTIN/UIN</span> : {data.buyer.gstin}</p>
                  )}
                  <p><span className="font-bold">State Name</span> : {data.buyer.stateName}, Code : {data.buyer.stateCode}</p>
                </td>
                <td className={`${cell} ${bdrR} ${bdrB} font-bold`}>Bill of Lading/LR-RR No.</td>
                <td colSpan={2} className={`${cell} ${bdrB} font-bold`}>Motor Vehicle No.</td>
              </tr>
              <tr>
                <td className={`${cell} ${bdrR} ${bdrB}`}>{data.billOfLading || ''}</td>
                <td colSpan={2} className={`${cell} ${bdrB}`}>{data.vehicleNo || ''}</td>
              </tr>
              <tr>
                <td colSpan={3} className={`${cell} ${bdrB} font-bold`}>Terms of Delivery</td>
              </tr>
              <tr>
                <td colSpan={3} className={`${cell}`}>{data.termsOfDelivery || ''}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ===== ITEMS TABLE ===== */}
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className={bdrB}>
              <th className={`${cell} ${bdrR} text-center w-[30px]`}>Sl<br/>No.</th>
              <th className={`${cell} ${bdrR} text-left`}>Description of Goods</th>
              <th className={`${cell} ${bdrR} text-center w-[70px]`}>HSN/SAC</th>
              <th className={`${cell} ${bdrR} text-center w-[50px]`}>GST<br/>Rate</th>
              <th className={`${cell} ${bdrR} text-right w-[60px]`}>Quantity</th>
              <th className={`${cell} ${bdrR} text-right w-[65px]`}>Rate</th>
              <th className={`${cell} ${bdrR} text-center w-[40px]`}>per</th>
              <th className={`${cell} text-right w-[85px]`}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className={bdrB}>
                <td className={`${cell} ${bdrR} text-center`}>{item.slNo}</td>
                <td className={`${cell} ${bdrR}`}>{item.description}</td>
                <td className={`${cell} ${bdrR} text-center`}>{item.hsnCode}</td>
                <td className={`${cell} ${bdrR} text-center`}>{item.gstRate} %</td>
                <td className={`${cell} ${bdrR} text-right`}>{item.quantity} {item.unit}</td>
                <td className={`${cell} ${bdrR} text-right`}>{fmt(item.rate)}</td>
                <td className={`${cell} ${bdrR} text-center`}>{item.unit}</td>
                <td className={`${cell} text-right`}>{fmt(item.amount)}</td>
              </tr>
            ))}
            
            
            {/* Empty spacer rows to fill page */}
            {data.items.length < 8 && Array.from({ length: Math.max(0, 3 - data.items.length) }).map((_, i) => (
              <tr key={`empty-${i}`} className={bdrB}>
                <td className={`${cell} ${bdrR}`}>&nbsp;</td>
                <td className={`${cell} ${bdrR}`}></td>
                <td className={`${cell} ${bdrR}`}></td>
                <td className={`${cell} ${bdrR}`}></td>
                <td className={`${cell} ${bdrR}`}></td>
                <td className={`${cell} ${bdrR}`}></td>
                <td className={`${cell} ${bdrR}`}></td>
                <td className={`${cell}`}></td>
              </tr>
            ))}

            {/* Subtotal (amount only, no label — matches PDF) */}
            <tr className={bdrB}>
              <td className={`${cell} ${bdrR}`}></td>
              <td className={`${cell} ${bdrR}`} colSpan={5}></td>
              <td className={`${cell} ${bdrR}`}></td>
              <td className={`${cell} text-right`}>{fmt(data.subtotal)}</td>
            </tr>
            {/* Output SGST */}
            <tr className={bdrB}>
              <td className={`${cell} ${bdrR}`}></td>
              <td className={`${cell} ${bdrR} text-right font-bold`} colSpan={5}>Output SGST</td>
              <td className={`${cell} ${bdrR}`}></td>
              <td className={`${cell} text-right`}>{fmt(data.totalSgst)}</td>
            </tr>
            {/* Output CGST */}
            <tr className={bdrB}>
              <td className={`${cell} ${bdrR}`}></td>
              <td className={`${cell} ${bdrR} text-right font-bold`} colSpan={5}>Output CGST</td>
              <td className={`${cell} ${bdrR}`}></td>
              <td className={`${cell} text-right`}>{fmt(data.totalCgst)}</td>
            </tr>
            {data.totalIgst && data.totalIgst > 0 && (
              <tr className={bdrB}>
                <td className={`${cell} ${bdrR}`}></td>
                <td className={`${cell} ${bdrR} text-right font-bold`} colSpan={5}>Output IGST</td>
                <td className={`${cell} ${bdrR}`}></td>
                <td className={`${cell} text-right`}>{fmt(data.totalIgst)}</td>
              </tr>
            )}
            {data.roundingOff !== 0 && (
              <tr className={bdrB}>
                <td className={`${cell} ${bdrR}`}></td>
                <td className={`${cell} ${bdrR} text-right font-bold`} colSpan={5}>Rounding Off</td>
                <td className={`${cell} ${bdrR}`}></td>
                <td className={`${cell} text-right`}>{fmt(data.roundingOff)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            {/* Total Row */}
            <tr className={`${bdrB} font-bold`}>
              <td className={`${cell} ${bdrR}`}></td>
              <td className={`${cell} ${bdrR} text-right`} colSpan={3}>Total</td>
              <td className={`${cell} ${bdrR} text-right`}>{totalQuantity} {data.items[0]?.unit || 'Nos'}</td>
              <td className={`${cell} ${bdrR}`}></td>
              <td className={`${cell} ${bdrR}`}></td>
              <td className={`${cell} text-right`}>₹ {fmt(data.grandTotal)}</td>
            </tr>
          </tfoot>
        </table>

        {/* ===== AMOUNT IN WORDS ===== */}
        <div className={`${bdrB} px-2 py-1`}>
          <div className="flex justify-between items-start">
            <p className="text-[10px]"><span className="font-bold">Amount Chargeable (in words)</span></p>
            <p className="text-[10px] text-right">E. & O.E</p>
          </div>
          <p className="font-bold text-[11px]">INR {numberToWords(data.grandTotal)}</p>
        </div>

        {/* ===== HSN/SAC TAX SUMMARY TABLE ===== */}
        <div className={bdrB}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className={bdrB}>
                <th className={`${cell} ${bdrR} text-center`} rowSpan={2}>HSN/SAC</th>
                <th className={`${cell} ${bdrR} text-center`} rowSpan={2}>Taxable<br/>Value</th>
                <th className={`${cell} ${bdrR} text-center`} colSpan={2}>Central Tax</th>
                <th className={`${cell} ${bdrR} text-center`} colSpan={2}>State Tax</th>
                <th className={`${cell} text-center`} rowSpan={2}>Total<br/>Tax Amount</th>
              </tr>
              <tr className={bdrB}>
                <th className={`${cell} ${bdrR} text-center`}>Rate</th>
                <th className={`${cell} ${bdrR} text-center`}>Amount</th>
                <th className={`${cell} ${bdrR} text-center`}>Rate</th>
                <th className={`${cell} ${bdrR} text-center`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.taxBreakdown.map((tax, index) => {
                const hsnCode = tax.hsnCode || data.items.find(item => {
                  const itemTaxKey = `${item.hsnCode}-${item.gstRate}`;
                  return itemTaxKey === `${tax.hsnCode || ''}-${tax.cgstRate * 2}`;
                })?.hsnCode || '';
                return (
                  <tr key={index} className={bdrB}>
                    <td className={`${cell} ${bdrR} text-center`}>{hsnCode}</td>
                    <td className={`${cell} ${bdrR} text-right`}>{fmt(tax.taxableValue)}</td>
                    <td className={`${cell} ${bdrR} text-center`}>{tax.cgstRate}%</td>
                    <td className={`${cell} ${bdrR} text-right`}>{fmt(tax.cgstAmount)}</td>
                    <td className={`${cell} ${bdrR} text-center`}>{tax.sgstRate}%</td>
                    <td className={`${cell} ${bdrR} text-right`}>{fmt(tax.sgstAmount)}</td>
                    <td className={`${cell} text-right`}>{fmt(tax.totalTax)}</td>
                  </tr>
                );
              })}
              {/* Total row */}
              <tr className={`${bdrB} font-bold`}>
                <td className={`${cell} ${bdrR} text-right`}>Total</td>
                <td className={`${cell} ${bdrR} text-right`}>{fmt(data.subtotal)}</td>
                <td className={`${cell} ${bdrR}`}></td>
                <td className={`${cell} ${bdrR} text-right`}>{fmt(data.totalCgst)}</td>
                <td className={`${cell} ${bdrR}`}></td>
                <td className={`${cell} ${bdrR} text-right`}>{fmt(data.totalSgst)}</td>
                <td className={`${cell} text-right`}>{fmt(data.totalCgst + data.totalSgst)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ===== TAX AMOUNT IN WORDS ===== */}
        <div className={`${bdrB} px-2 py-1`}>
          <p className="text-[10px]"><span className="font-bold">Tax Amount (in words) :</span>{' '}
            <span className="font-bold">INR {numberToWords(data.totalCgst + data.totalSgst + (data.totalIgst || 0))}</span>
          </p>
        </div>

        {/* ===== DECLARATION + SIGNATORY ===== */}
        <div className={`flex ${bdrB}`}>
          <div className={`w-1/2 ${bdrR} p-2`}>
            <p className="font-bold text-[10px] mb-1">Declaration</p>
            <p className="text-[10px] leading-tight">
              We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
            </p>
          </div>
          <div className="w-1/2 p-2 text-right">
            <p className="font-bold text-[10px] mb-1">for {data.seller.name}</p>
            <div className="h-[40px]"></div>
            <p className="font-bold text-[10px] border-t border-gray-400 pt-1 inline-block">Authorised Signatory</p>
          </div>
        </div>

        {/* Computer Generated Invoice — inside the border */}
        <div className="text-center py-1 text-[10px] text-gray-500">
          <p>This is a Computer Generated Invoice</p>
        </div>
      </div>
    </div>
  );
});

TaxInvoice.displayName = 'TaxInvoice';

export default TaxInvoice;
export type { InvoiceData, InvoiceItem, TaxBreakdown };

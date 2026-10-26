import { describe, expect, it } from 'vitest';

import { parseCSV } from './csv';
import {
  cleanMerchant,
  detectColumns,
  extractExpenses,
  extractTransactions,
  importKeys,
  incomeCategoryFor,
  parseStatementAmount,
  parseStatementDate,
} from './statement';

describe('parseCSV', () => {
  it('handles quotes, embedded commas, CRLF and a BOM', () => {
    expect(parseCSV('﻿a,"b, c","say ""hi"""\r\n1,2,3\r\n')).toEqual([
      ['a', 'b, c', 'say "hi"'],
      ['1', '2', '3'],
    ]);
  });
  it('detects semicolons and drops blank lines', () => {
    expect(parseCSV('a;b\n\n1;2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('parseStatementDate', () => {
  it.each([
    ['05/10/2026', '2026-10-05'],
    ['05-10-26', '2026-10-05'],
    ['5.10.2026', '2026-10-05'],
    ['05-Oct-2026', '2026-10-05'],
    ['05 Oct 2026', '2026-10-05'],
    ['5 October, 2026', '2026-10-05'],
    ['2026-10-05', '2026-10-05'],
    ['05/10/2026 14:32:01', '2026-10-05'],
  ])('%s', (input, iso) => expect(parseStatementDate(input)).toBe(iso));
  it.each(['31/02/2026', 'Opening Balance', '', '13/13/2026'])('rejects %s', (input) => expect(parseStatementDate(input)).toBeNull());
});

describe('parseStatementAmount', () => {
  it('reads Indian-formatted amounts and directions', () => {
    expect(parseStatementAmount('1,234.50')).toEqual({ paise: 123450, direction: null });
    expect(parseStatementAmount('₹ 1,234.50 Dr')).toEqual({ paise: 123450, direction: 'debit' });
    expect(parseStatementAmount('500.00 CR')).toEqual({ paise: 50000, direction: 'credit' });
    expect(parseStatementAmount('-500')).toEqual({ paise: 50000, direction: 'debit' });
    expect(parseStatementAmount('(250.75)')).toEqual({ paise: 25075, direction: 'debit' });
    expect(parseStatementAmount('')).toBeNull();
    expect(parseStatementAmount('0.00')).toBeNull();
  });
});

describe('cleanMerchant', () => {
  it.each([
    ['UPI/DR/412345678901/SWIGGY/YESB/swiggy@ybl/Payment', 'Swiggy'],
    ['UPI-ZOMATO LTD-zomato@hdfcbank-HDFC0000001-612345678901-UPI', 'Zomato'],
    ['UPI/P2M/612345678901/Uber India Systems/UPI/HDFC0MERUPI', 'Uber'],
    ['UPI/CR/612345678901/RAHUL SHARMA/SBIN/rahul.s@okaxis/dinner', 'Rahul Sharma'],
    ['POS 4567XXXX1234 AMAZON PAY INDIA', 'Amazon Pay'],
    ['UPI-9876543210@paytm-PYTM0123456-612345678901-', 'UPI transfer'],
    ['NEFT-HDFCN52026102512345-ACME CORP PVT LTD-SALARY', 'Acme Corp'],
    ['upi/blinkit/blinkit.payu@hdfcbank', 'Blinkit'],
    ['IMPS/P2A/612345678901/9876543210', 'Unknown'],
    ['UPI/DR/612345678901/Hotel Taj-Mahal/HDFC/taj@hdfc/x', 'Hotel Taj Mahal'],
    ['UPI/DR/612345678901/9876543210@ybl/YESB/Payment', 'UPI transfer'],
    ['ATM WDL/ATM CASH 1234 MG ROAD', 'ATM cash'],
    ['IMPS/P2A/612345678901/HDFCBANK/ROHAN', 'Rohan'],
    ['UPI/DR/612345678901/Pay Tm Mall/x', 'Pay Tm Mall'],
    ['ONE97 COMMUNICATIONS LTD', 'Paytm'],
    ["UPI/DR/612345678901/Domino's Pizza/x", "Domino's Pizza"],
    ['POS 4567XXXX5678 DMART MUMBAI', 'Dmart'],
  ])('%s → %s', (raw, name) => {
    expect(cleanMerchant(raw)).toBe(name);
  });
});

describe('statement import', () => {
  const hdfc = `HDFC BANK Ltd.
Account No : 50100123456789
Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance
05/10/26,UPI-SWIGGY-swiggy@ybl-YESB0000001-612345678901-UPI,0000612345678901,05/10/26,349.00,,10651.00
06/10/26,NEFT-ACME CORP PVT LTD-SALARY,0000,06/10/26,,85000.00,95651.00
07/10/26,"UPI-UBER INDIA-uber@axis-UTIB0000001-612345678902-Ride, office",0000,07/10/26,"1,250.50",,94400.50
,Closing balance,,,,,94400.50`;

  it('finds the header after preamble rows and keeps only money out', () => {
    const rows = parseCSV(hdfc);
    const detected = detectColumns(rows)!;
    expect(detected.headerRow).toBe(2);
    expect(detected.map).toMatchObject({ date: 0, description: 1, debit: 4, credit: 5 });
    expect(extractExpenses(rows, detected.headerRow, detected.map)).toEqual([
      { date: '2026-10-05', amount: 34900, raw: 'UPI-SWIGGY-swiggy@ybl-YESB0000001-612345678901-UPI' },
      { date: '2026-10-07', amount: 125050, raw: 'UPI-UBER INDIA-uber@axis-UTIB0000001-612345678902-Ride, office' },
    ]);
  });

  it('also reads money in, keyed apart from money out', () => {
    const rows = parseCSV(hdfc);
    const detected = detectColumns(rows)!;
    const all = extractTransactions(rows, detected.headerRow, detected.map);
    expect(all.map((t) => [t.date, t.amount, t.type ?? 'out'])).toEqual([
      ['2026-10-05', 34900, 'out'],
      ['2026-10-06', 8500000, 'income'],
      ['2026-10-07', 125050, 'out'],
    ]);
    expect(incomeCategoryFor(all[1]!.raw)).toBe('salary');
    expect(incomeCategoryFor('UPI/CR/123/RAHUL/x')).toBe('people');
    expect(importKeys([all[0]!])[0]).not.toContain('|in');
    expect(importKeys([all[1]!])[0]).toMatch(/\|in$/);
  });

  it('supports a single amount column with a Dr/Cr type', () => {
    const rows = parseCSV('Txn Date,Description,Amount,Dr/Cr\n05-Oct-2026,UPI/DR/1/ZEPTO/x,220.00,DR\n06-Oct-2026,Refund,50,CR');
    const detected = detectColumns(rows)!;
    expect(extractExpenses(rows, detected.headerRow, detected.map)).toEqual([
      { date: '2026-10-05', amount: 22000, raw: 'UPI/DR/1/ZEPTO/x' },
    ]);
  });

  it('prefers the transaction date over the value date', () => {
    const rows = parseCSV('S No.,Value Date,Transaction Date,Transaction Remarks,Withdrawal Amount (INR ),Deposit Amount (INR )\n1,02/10/2026,03/10/2026,UPI/x,100,');
    const detected = detectColumns(rows)!;
    expect(extractExpenses(rows, detected.headerRow, detected.map)[0]!.date).toBe('2026-10-03');
  });

  it('reads posted-date / debit-amount headers', () => {
    expect(detectColumns(parseCSV('Posted Date,Description,Debit Amount,Credit Amount\n05/10/2026,x,1,'))).not.toBeNull();
  });

  it('reads files without a header row from the first line', () => {
    const rows = parseCSV('05/10/2026,PVR Cinemas,450.00\n06/10/2026,Chai,20');
    expect(extractExpenses(rows, -1, { date: 0, description: 1, debit: 2, credit: -1, amount: -1, type: -1 })).toHaveLength(2);
  });

  it('keeps identical lines on the same day apart, but stable across re-imports', () => {
    const atm = { date: '2026-10-25', amount: 50000, raw: 'ATM WDL' };
    const keys = importKeys([atm, atm, { ...atm, amount: 20000 }]);
    expect(new Set(keys).size).toBe(3);
    expect(importKeys([atm, atm])).toEqual(keys.slice(0, 2));
  });

  it('returns null when it cannot find the columns', () => {
    expect(detectColumns(parseCSV('foo,bar\n1,2'))).toBeNull();
  });
});

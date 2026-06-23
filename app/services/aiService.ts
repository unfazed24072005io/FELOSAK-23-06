// app/services/aiService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = 'AIzaSyBc8GQ5u-JYiVM0dL2S6ngcNtrlVh3jpdc';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface AIGeneratedDocument {
  type: "Invoice" | "Quote" | "Purchase Order" | "Credit Note" | "Delivery Note";
  partyName: string;
  amount: number;
  dueDate: string;
  items: Array<{ name: string; quantity: number; price: number; total: number }>;
  notes: string;
}

function getDefaultDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
}

// ========== FIXED: DOCUMENT TYPE DETECTION ==========
function extractDocumentType(text: string): AIGeneratedDocument['type'] {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('credit note')) return "Credit Note";
  if (lowerText.includes('delivery note')) return "Delivery Note";
  if (lowerText.includes('purchase order') || lowerText.includes('po')) return "Purchase Order";
  if (lowerText.includes('quote') || lowerText.includes('quotation')) return "Quote";
  return "Invoice";
}

// ========== FIXED: EXTRACT AMOUNT (For "5000 EGP" pattern) ==========
function extractAmount(text: string): number {
  // Pattern: "for 5000 EGP" or "for 5000 pounds" or just "5000 EGP"
  const amountPatterns = [
    /(?:for|of|amount|total)\s+(\d+(?:,\d+)*(?:\.\d+)?)\s+(?:EGP|pounds?|rupees?|dollars?)/i,
    /(\d+(?:,\d+)*(?:\.\d+)?)\s+(?:EGP|pounds?)\s+(?:only)?$/i,
    /invoice\s+for\s+(\d+(?:,\d+)*(?:\.\d+)?)/i,
    /(\d+(?:,\d+)*(?:\.\d+)?)\s+(?:EGP|pounds?)\b/i,
  ];
  
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (amount > 0 && amount < 10000000) {
        return amount;
      }
    }
  }
  return 0;
}

// ========== FIXED: EXTRACT PARTY/CUSTOMER NAME ==========
function extractPartyName(text: string): string {
  // Pattern: "for Ahmed" or "invoice for Ahmed"
  const patterns = [
    /(?:invoice|quote|order)\s+for\s+([A-Za-z][A-Za-z\s]{1,20}?)(?:\s+(?:for|amount|of|\d))/i,
    /for\s+([A-Za-z][A-Za-z\s]{1,20}?)(?:\s+for\s+|\s+amount\s+|\s*$)/i,
    /(?:to|for)\s+([A-Za-z][A-Za-z\s]{1,20}?)(?:\s+(?:for|with|amount|of))/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let name = match[1].trim();
      name = name.split(/\s+/)[0]; // Take first word only
      if (name.length >= 2 && !name.toLowerCase().match(/invoice|quote|order|amount|egp|pounds/)) {
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      }
    }
  }
  
  // Check for capitalized name at the end
  const endMatch = text.match(/for\s+([A-Z][a-z]+)\s*$/);
  if (endMatch && endMatch[1]) {
    return endMatch[1];
  }
  
  return "Customer";
}

// ========== FIXED: EXTRACT ITEM NAME ==========
function extractItemName(text: string): string {
  const patterns = [
    // "for 10 laptops" or "for 2 printers"
    /(?:for|of)\s+(?:\d+\s+)?([A-Za-z][A-Za-z\s]{2,20}?)\s+(?:at|for|@|each|price|rate|\d)/i,
    // "10 laptops at" 
    /\d+\s+([A-Za-z][A-Za-z\s]{2,20}?)\s+at\s+/i,
    // "item name is laptop"
    /(?:item|product)\s+(?:name\s+is\s+)?([A-Za-z][A-Za-z\s]{2,20}?)(?:\s+(?:with|and|for|at))/i,
    // "for laptops at"
    /for\s+([A-Za-z][A-Za-z\s]{2,20}?)\s+at\s+/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let item = match[1].trim();
      // Remove common stop words
      item = item.split(/\s+(?:for|at|with|and|price|rate)/i)[0];
      if (item.length >= 3) {
        return item.toUpperCase();
      }
    }
  }
  
  // Common product detection
  const commonItems = ['LAPTOP', 'PRINTER', 'CHAIR', 'DESK', 'PHONE', 'TABLET', 'BOX', 'UNIT', 'PIECE'];
  for (const item of commonItems) {
    if (text.toUpperCase().includes(item)) {
      return item;
    }
  }
  
  return "PRODUCT";
}

// ========== FIXED: EXTRACT QUANTITY/NUMBER OF ITEMS ==========
function extractQuantity(text: string): number {
  // Pattern: "10 laptops" or "2 printers" or "quantity 5"
  const patterns = [
    /(\d+)\s+(?:laptops?|printers?|chairs?|desks?|phones?|tablets?|boxes?|units?|pieces?|items?)/i,
    /(?:quantity|qty|number of items?)\s+(?:is\s+)?(\d+)/i,
    /(\d+)\s+x\s+[A-Za-z]/i,
    /(\d+)\s+[A-Za-z]+\s+(?:at|for|each)/i,
    /for\s+(\d+)\s+[A-Za-z]/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const qty = parseInt(match[1]);
      if (qty > 0 && qty < 10000) {
        return qty;
      }
    }
  }
  
  // Word numbers
  const wordNumbers: { [key: string]: number } = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
  };
  
  for (const [word, num] of Object.entries(wordNumbers)) {
    if (text.toLowerCase().includes(` ${word} `) || text.toLowerCase().startsWith(`${word} `)) {
      return num;
    }
  }
  
  return 1; // Default to 1
}

// ========== FIXED: EXTRACT PRICE PER ITEM ==========
function extractPrice(text: string): number {
  const patterns = [
    /(?:at|@|for|price|rate)\s+(?:EGP)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s+(?:each|per|EGP|pounds?)/i,
    /(\d+(?:,\d+)*(?:\.\d+)?)\s+(?:EGP|pounds?)\s+each/i,
    /(?:each|per)\s+(?:item|unit)\s+(?:is|at)\s+(\d+(?:,\d+)*(?:\.\d+)?)/i,
    /@\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
    /(\d+(?:,\d+)*(?:\.\d+)?)\s+per\s+(?:piece|unit|item)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (price > 0 && price < 1000000) {
        return price;
      }
    }
  }
  
  return 0;
}

// ========== MAIN PARSER - FIXED VERSION ==========
function parseUserInput(userInput: string): AIGeneratedDocument | null {
  console.log('🔍 INPUT:', userInput);
  
  const docType = extractDocumentType(userInput);
  const partyName = extractPartyName(userInput);
  const itemName = extractItemName(userInput);
  const quantity = extractQuantity(userInput);
  const pricePerItem = extractPrice(userInput);
  const totalAmount = extractAmount(userInput);
  
  console.log('📊 PARSED:', { docType, partyName, itemName, quantity, pricePerItem, totalAmount });
  
  let subtotal = 0;
  let finalAmount = 0;
  
  // Case 1: Has price per item and quantity
  if (pricePerItem > 0 && quantity > 0) {
    subtotal = quantity * pricePerItem;
    finalAmount = docType === "Quote" ? subtotal : Math.round(subtotal * 1.14);
    console.log(`✅ Calculated: ${quantity} × ${pricePerItem} = ${subtotal} + 14% tax = ${finalAmount}`);
  }
  // Case 2: Has total amount only (no price per item)
  else if (totalAmount > 0) {
    subtotal = totalAmount;
    finalAmount = docType === "Quote" ? subtotal : Math.round(subtotal * 1.14);
    console.log(`✅ Amount only: ${totalAmount} + 14% tax = ${finalAmount}`);
  }
  else {
    console.log('❌ Missing amount or price');
    return null;
  }
  
  return {
    type: docType,
    partyName: partyName,
    amount: finalAmount,
    dueDate: getDefaultDueDate(),
    items: [{
      name: itemName,
      quantity: quantity,
      price: pricePerItem > 0 ? pricePerItem : (totalAmount / quantity),
      total: subtotal
    }],
    notes: `Created on ${new Date().toISOString().split('T')[0]}. ${docType !== "Quote" ? "14% VAT included. Payment due within 30 days" : "Valid for 30 days"}`,
  };
}

// ========== EXPORT MAIN FUNCTION ==========
export async function generateDocumentWithAI(userMessage: string): Promise<AIGeneratedDocument | null> {
  try {
    // First try local parsing
    const parsed = parseUserInput(userMessage);
    if (parsed && (parsed.items[0].price > 0 || parsed.amount > 0)) {
      console.log('✅ Local parse successful:', parsed);
      return parsed;
    }
    
    console.log('🤖 Falling back to AI...');
    
    // AI Fallback
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Parse this invoice request. Return ONLY valid JSON:
"${userMessage}"

Output format: {"type":"Invoice/Quote","partyName":"name","itemName":"item","quantity":number,"pricePerItem":number,"totalAmount":number}

Rules:
- If user says "for 5000 EGP" → set totalAmount=5000
- If user says "10 laptops at 2500 each" → set quantity=10, itemName="LAPTOP", pricePerItem=2500
- If user says "invoice for Ahmed" → set partyName="Ahmed"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const aiData = JSON.parse(jsonMatch[0]);
      const quantity = aiData.quantity || 1;
      const price = aiData.pricePerItem || 0;
      const amount = aiData.totalAmount || 0;
      
      let subtotal = 0;
      let finalAmount = 0;
      
      if (price > 0 && quantity > 0) {
        subtotal = quantity * price;
        finalAmount = aiData.type === "Quote" ? subtotal : Math.round(subtotal * 1.14);
      } else if (amount > 0) {
        subtotal = amount;
        finalAmount = aiData.type === "Quote" ? subtotal : Math.round(subtotal * 1.14);
      } else {
        return null;
      }
      
      return {
        type: aiData.type || "Invoice",
        partyName: aiData.partyName || "Customer",
        amount: finalAmount,
        dueDate: getDefaultDueDate(),
        items: [{
          name: aiData.itemName || "PRODUCT",
          quantity: quantity,
          price: price > 0 ? price : (amount / quantity),
          total: subtotal
        }],
        notes: `Created on ${new Date().toISOString().split('T')[0]}. 14% VAT included`,
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}
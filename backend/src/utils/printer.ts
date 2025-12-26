import { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } from 'node-thermal-printer';

export interface PrinterConfig {
  type: 'ethernet' | 'usb';
  interface: string;
  characterSet?: CharacterSet;
  removeSpecialCharacters?: boolean;
  lineCharacter?: string;
}

export const createPrinter = (config: PrinterConfig): ThermalPrinter => {
  return new ThermalPrinter({
    type: config.type === 'ethernet' ? PrinterTypes.EPSON : PrinterTypes.EPSON,
    interface: config.interface,
    characterSet: config.characterSet || CharacterSet.PC852_LATIN2,
    removeSpecialCharacters: config.removeSpecialCharacters || false,
    lineCharacter: config.lineCharacter || "-",
  });
};

export const printKitchenOrder = async (orderData: any): Promise<boolean> => {
  try {
    const printerConfig: PrinterConfig = {
      type: 'ethernet',
      interface: process.env.KITCHEN_PRINTER_IP || '192.168.1.100'
    };

    const printer = createPrinter(printerConfig);

    printer.alignCenter();
    printer.setTextSize(1, 1);
    printer.bold(true);
    printer.println("=== KITCHEN ORDER ===");
    printer.bold(false);
    printer.newLine();

    printer.alignLeft();
    printer.setTextSize(0, 0);
    printer.println(`Table: ${orderData.tableNumber}`);
    printer.println(`Order: ${orderData.orderNumber}`);
    printer.println(`Time: ${new Date().toLocaleString()}`);
    printer.drawLine();

    for (const item of orderData.items) {
      printer.setTextSize(0, 1);
      printer.bold(true);
      printer.println(`${item.quantity}x ${item.name}`);
      printer.bold(false);
      printer.setTextSize(0, 0);
      
      if (item.selectedVariation) {
        printer.println(`   Variation: ${item.selectedVariation}`);
      }
      
      if (item.addOns && item.addOns.length > 0) {
        printer.println(`   Add-ons: ${item.addOns.join(', ')}`);
      }
      
      if (item.notes) {
        printer.println(`   Notes: ${item.notes}`);
      }
      printer.newLine();
    }

    printer.drawLine();
    printer.alignCenter();
    printer.println("End of Order");
    printer.cut();

    await printer.execute();
    console.log('Kitchen order printed successfully');
    return true;
  } catch (error) {
    console.error('Kitchen printer error:', error);
    return false;
  }
};

export const printBill = async (billData: any): Promise<boolean> => {
  try {
    const printerConfig: PrinterConfig = {
      type: 'ethernet',
      interface: process.env.CASHIER_PRINTER_IP || '192.168.1.101'
    };

    const printer = createPrinter(printerConfig);

    printer.alignCenter();
    printer.setTextSize(1, 1);
    printer.bold(true);
    printer.println("RESTAURANT BILL");
    printer.bold(false);
    printer.newLine();

    printer.alignLeft();
    printer.setTextSize(0, 0);
    printer.println(`Bill #: ${billData.billNumber}`);
    printer.println(`Table: ${billData.tableNumber}`);
    printer.println(`Date: ${new Date(billData.createdAt).toLocaleString()}`);
    printer.drawLine();

    let subtotal = 0;
    for (const order of billData.orders) {
      for (const item of order.items) {
        const itemLine = `${item.quantity}x ${item.name}`;
        const price = `$${item.totalPrice.toFixed(2)}`;
        const spaces = 32 - itemLine.length - price.length;
        printer.println(itemLine + ' '.repeat(Math.max(1, spaces)) + price);
        
        if (item.selectedVariation) {
          printer.println(`   ${item.selectedVariation}`);
        }
        
        if (item.addOns && item.addOns.length > 0) {
          printer.println(`   ${item.addOns.join(', ')}`);
        }
        
        subtotal += item.totalPrice;
      }
    }

    printer.drawLine();
    
    const subtotalLine = `Subtotal:`;
    const subtotalPrice = `$${billData.subtotal.toFixed(2)}`;
    let spaces = 32 - subtotalLine.length - subtotalPrice.length;
    printer.println(subtotalLine + ' '.repeat(Math.max(1, spaces)) + subtotalPrice);

    const taxLine = `Tax (10%):`;
    const taxPrice = `$${billData.tax.toFixed(2)}`;
    spaces = 32 - taxLine.length - taxPrice.length;
    printer.println(taxLine + ' '.repeat(Math.max(1, spaces)) + taxPrice);

    if (billData.discount > 0) {
      const discountLine = `Discount:`;
      const discountPrice = `-$${billData.discount.toFixed(2)}`;
      spaces = 32 - discountLine.length - discountPrice.length;
      printer.println(discountLine + ' '.repeat(Math.max(1, spaces)) + discountPrice);
    }

    printer.drawLine();
    printer.setTextSize(0, 1);
    printer.bold(true);
    const totalLine = `TOTAL:`;
    const totalPrice = `$${billData.total.toFixed(2)}`;
    spaces = 32 - totalLine.length - totalPrice.length;
    printer.println(totalLine + ' '.repeat(Math.max(1, spaces)) + totalPrice);
    printer.bold(false);
    printer.setTextSize(0, 0);

    printer.newLine();
    printer.println(`Payment: ${billData.paymentType}`);
    printer.drawLine();
    
    printer.alignCenter();
    printer.println("Thank you for dining with us!");
    printer.cut();

    await printer.execute();
    console.log('Bill printed successfully');
    return true;
  } catch (error) {
    console.error('Bill printer error:', error);
    return false;
  }
};
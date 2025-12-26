import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Calculator, Receipt, Clock } from 'lucide-react';
import { apiService } from '../services/api';
import { Order, Bill } from '../types';

interface IndividualOrdersBillingProps {
  bills: Bill[];
  onBillOrder: (tableId: string, selectedOrders?: string[]) => void;
  loadingPreview: boolean;
}

interface TableOrders {
  tableId: string;
  tableNumber: string;
  orders: Order[];
}

const IndividualOrdersBilling: React.FC<IndividualOrdersBillingProps> = ({
  bills,
  onBillOrder,
  loadingPreview
}) => {
  const [, setServedOrders] = useState<Order[]>([]);
  const [tableOrdersMap, setTableOrdersMap] = useState<{[key: string]: TableOrders}>({});

  useEffect(() => {
    fetchServedOrders();
  }, [bills]);

  const fetchServedOrders = async () => {
    try {
      const orders = await apiService.getOrders({ status: 'Served' }) as Order[];
      const unbilledOrders = orders.filter(order => !order.isBilled);
      setServedOrders(unbilledOrders);

      // Group orders by table
      const groupedOrders: {[key: string]: TableOrders} = {};
      unbilledOrders.forEach(order => {
        const tableId = typeof order.tableId === 'object' ? order.tableId._id : order.tableId;
        const tableNumber = typeof order.tableId === 'object' ? order.tableId.tableNumber : tableId;
        
        if (!groupedOrders[tableId]) {
          groupedOrders[tableId] = {
            tableId,
            tableNumber,
            orders: []
          };
        }
        groupedOrders[tableId].orders.push(order);
      });

      setTableOrdersMap(groupedOrders);
    } catch (error) {
      console.error('Error fetching served orders:', error);
    }
  };

  const tablesWithMultipleOrders = Object.values(tableOrdersMap).filter(
    tableOrders => tableOrders.orders.length > 1
  );

  if (tablesWithMultipleOrders.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center space-x-2">
          <Receipt className="h-5 w-5 text-blue-600" />
          <span>Individual Orders Ready for Billing</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Tables with multiple served orders - bill them individually or together
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tablesWithMultipleOrders.map((tableOrders) => (
            <Card key={tableOrders.tableId} className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Table {tableOrders.tableNumber}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {tableOrders.orders.length} orders
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tableOrders.orders.map((order) => (
                    <Card key={order._id} className="bg-background border-border">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-sm">Order #{order.orderNumber}</h4>
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(order.createdAt).toLocaleTimeString()}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">रू {order.totalAmount.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{order.items.length} items</p>
                          </div>
                        </div>
                        
                        <div className="space-y-1 mb-3">
                          {order.items.slice(0, 2).map((item, index) => (
                            <div key={index} className="text-xs text-muted-foreground">
                              {typeof item.itemId === 'object' ? item.itemId.name : 'Unknown Item'} x{item.quantity}
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{order.items.length - 2} more items
                            </div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          onClick={() => onBillOrder(tableOrders.tableId, [order._id])}
                          loading={loadingPreview}
                          loadingText="Loading..."
                          className="w-full flex items-center space-x-1"
                        >
                          <Calculator className="h-3 w-3" />
                          <span>Bill This Order</span>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="pt-2 border-t">
                  <Button
                    onClick={() => onBillOrder(tableOrders.tableId)}
                    loading={loadingPreview}
                    loadingText="Loading..."
                    className="w-full sm:w-auto flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                  >
                    <Receipt className="h-4 w-4" />
                    <span>Bill All Orders Together (रू {tableOrders.orders.reduce((sum, order) => sum + order.totalAmount, 0).toFixed(2)})</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default IndividualOrdersBilling;
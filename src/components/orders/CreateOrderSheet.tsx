import { useState, useEffect } from 'react';
import { useProducts, Product } from '@/hooks/useProducts';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, ShoppingCart, Trash2, Check, ChevronsUpDown, UserPlus, Loader2, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CartItem extends Product {
  cartQuantity: number;
}

interface CreateOrderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateOrderSheet({ open, onOpenChange, onSuccess }: CreateOrderSheetProps) {
  const { products } = useProducts();
  const { customers, createCustomer } = useCustomers();
  const { store } = useStore();
  const { toast } = useToast();

  // State
  const [step, setStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [status, setStatus] = useState('approved');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New Customer State
  const [isNewCustomerMode, setIsNewCustomerMode] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // Cart Logic
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id 
          ? { ...p, cartQuantity: Math.min(p.cartQuantity + 1, product.quantity) } 
          : p
        );
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
    setIsProductOpen(false);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(p => p.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setCart(prev => prev.map(p => p.id === productId 
      ? { ...p, cartQuantity: Math.min(quantity, product.quantity) } 
      : p
    ));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.selling_price * item.cartQuantity), 0);

  // New Customer Logic
  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) return;
    setIsCreatingCustomer(true);
    try {
      const newCustomer = await createCustomer.mutateAsync({
        name: newCustomerName,
        phone: newCustomerPhone
      });
      setSelectedCustomer(newCustomer as unknown as Customer); // Type assertion if needed
      setIsNewCustomerMode(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      toast({ title: 'Cliente cadastrado com sucesso!' });
    } catch (error) {
      // Error handled by hook
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // Finish Sale Logic
  const handleFinishSale = async () => {
    if (!store) return;
    if (!selectedCustomer) {
      toast({ title: 'Selecione um cliente', variant: 'destructive' });
      return;
    }
    if (cart.length === 0) {
      toast({ title: 'O carrinho está vazio', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create Order Header
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        store_id: store.id,
        customer_id: selectedCustomer.id,
        total_amount: cartTotal,
        status: status,
        payment_method: paymentMethod,
        created_at: new Date().toISOString()
      }).select().single();

      if (orderError) throw orderError;

      // 2. Create Order Items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.cartQuantity,
        unit_price: item.selling_price
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      // 3. Update Inventory & 4. Register Financial Transaction
      for (const item of cart) {
        // Decrement stock
        // Try RPC first, fallback to update
        try {
          const { error: rpcError } = await supabase.rpc('decrement_stock', {
            row_id: item.id,
            quantity: item.cartQuantity
          });
          if (rpcError) throw rpcError;
        } catch (e) {
          // Fallback: Manual update (less safe but works without RPC)
          await supabase.from('products')
            .update({ quantity: item.quantity - item.cartQuantity })
            .eq('id', item.id);
        }

        // Register transaction (Revenue)
        // Only if status is approved/paid
        if (status === 'approved' || status === 'delivered' || status === 'shipped' || status === 'packing') {
             await supabase.from('transactions').insert({
                store_id: store.id,
                description: `Venda #${order.id.slice(0, 8)} - ${selectedCustomer.name}`,
                amount: item.selling_price * item.cartQuantity,
                type: 'sale',
                category: 'Vendas',
                product_id: item.id,
                product_name: item.name,
                customer_id: selectedCustomer.id,
                quantity: item.cartQuantity,
                unit_price: item.selling_price,
                total_amount: item.selling_price * item.cartQuantity,
                date: new Date().toISOString()
             });
        }
      }

      toast({ 
        title: 'Venda realizada com sucesso!',
        description: `Pedido #${order.id.slice(0, 8)} criado.` 
      });
      
      onOpenChange(false);
      setCart([]);
      setSelectedCustomer(null);
      setStep(1);
      if (onSuccess) onSuccess();

    } catch (error: any) {
      console.error('Error creating order:', error);
      
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        toast({
          title: 'Erro de Configuração',
          description: 'A tabela de pedidos não foi encontrada. Execute o script SQL no Supabase.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Erro ao finalizar venda',
          description: error.message || 'Ocorreu um erro ao processar o pedido.',
          variant: 'destructive'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl flex flex-col h-full" side="right">
        <SheetHeader>
          <SheetTitle>Nova Venda (PDV)</SheetTitle>
          <SheetDescription>
            Crie um novo pedido, adicione produtos e registre o pagamento.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Step 1: Client Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">1. Cliente</Label>
            {!isNewCustomerMode ? (
              <div className="flex gap-2">
                <Popover open={isCustomerOpen} onOpenChange={setIsCustomerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isCustomerOpen}
                      className="flex-1 justify-between"
                    >
                      {selectedCustomer ? selectedCustomer.name : "Selecione um cliente..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar cliente..." />
                      <CommandList>
                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                        <CommandGroup>
                          {customers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={customer.name}
                              onSelect={() => {
                                setSelectedCustomer(customer);
                                setIsCustomerOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{customer.name}</span>
                                {customer.phone && <span className="text-xs text-muted-foreground">{customer.phone}</span>}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="icon" onClick={() => setIsNewCustomerMode(true)}>
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3 p-3 border rounded-md bg-secondary/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Novo Cliente</span>
                  <Button variant="ghost" size="sm" onClick={() => setIsNewCustomerMode(false)}>Cancelar</Button>
                </div>
                <Input 
                  placeholder="Nome do cliente" 
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                />
                <Input 
                  placeholder="Telefone (opcional)" 
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                />
                <Button 
                  className="w-full" 
                  size="sm" 
                  onClick={handleCreateCustomer}
                  disabled={!newCustomerName.trim() || isCreatingCustomer}
                >
                  {isCreatingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cadastrar e Selecionar'}
                </Button>
              </div>
            )}
          </div>

          {/* Step 2: Product Selection (Cart) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">2. Produtos (Carrinho)</Label>
            
            <Popover open={isProductOpen} onOpenChange={setIsProductOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isProductOpen}
                  className="w-full justify-between mb-2"
                >
                  <span className="flex items-center text-muted-foreground">
                    <Search className="mr-2 h-4 w-4" /> Adicionar produto...
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar por nome ou código..." />
                  <CommandList>
                    <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                    <CommandGroup>
                      {products.map((product) => (
                        <CommandItem
                          key={product.id}
                          value={product.name}
                          onSelect={() => addToCart(product)}
                          disabled={product.quantity <= 0}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex flex-col">
                              <span>{product.name}</span>
                              <span className="text-xs text-muted-foreground">
                                Estoque: {product.quantity}
                              </span>
                            </div>
                            <span className="font-medium text-primary">
                              {formatCurrency(product.selling_price)}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Cart Items List */}
            {cart.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/20">
                      <TableHead>Produto</TableHead>
                      <TableHead className="w-20 text-center">Qtd</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="py-2">
                          <span className="font-medium text-sm">{item.name}</span>
                          <div className="text-xs text-muted-foreground">{formatCurrency(item.selling_price)} un.</div>
                        </TableCell>
                        <TableCell className="py-2 text-center">
                          <Input 
                            type="number" 
                            min="1" 
                            max={item.quantity}
                            value={item.cartQuantity} 
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                            className="h-8 w-16 text-center mx-auto"
                          />
                        </TableCell>
                        <TableCell className="py-2 text-right font-medium">
                          {formatCurrency(item.selling_price * item.cartQuantity)}
                        </TableCell>
                        <TableCell className="py-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive/90"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="p-4 bg-primary/5 flex justify-between items-center border-t">
                  <span className="font-medium">Total do Pedido</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(cartTotal)}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-secondary/10 text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">O carrinho está vazio</p>
              </div>
            )}
          </div>

          {/* Step 3: Payment & Status */}
          <div className="space-y-4 pt-2">
            <Label className="text-sm font-medium">3. Pagamento e Status</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Método de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                    <SelectItem value="money">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Status do Pedido</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">🟡 Pendente</SelectItem>
                    <SelectItem value="approved">🔵 Aprovado (Pago)</SelectItem>
                    <SelectItem value="packing">🟣 Em Separação</SelectItem>
                    <SelectItem value="shipped">🚚 Enviado</SelectItem>
                    <SelectItem value="delivered">✅ Entregue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="mt-auto border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
          <Button 
            className="gradient-primary" 
            onClick={handleFinishSale} 
            disabled={isSubmitting || cart.length === 0 || !selectedCustomer}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" /> Finalizar Venda
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

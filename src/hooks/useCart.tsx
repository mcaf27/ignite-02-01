import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const itemAlreadyInCart = cart.find((item) => item.id === productId);
      if (!!itemAlreadyInCart) {
        updateProductAmount({
          productId,
          amount: itemAlreadyInCart.amount + 1,
        });
        return;
      }

      const { data: stockData } = await api.get(`/stock/${productId}`);
      const stockedAmount = stockData.amount;

      if (stockedAmount < 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const { data: product } = await api.get(`/products/${productId}`);
      const newCart = [...cart, { ...product, amount: 1 }];
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIsInCart = !!cart.find((item) => item.id === productId);
      if (!productIsInCart) throw Error;

      const newCart = cart.filter((item) => item.id !== productId);
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) return;

      const { data } = await api.get(`/stock/${productId}`);
      const stockedAmount = data.amount;

      if (stockedAmount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      const newCart = cart.map((item) => {
        if (item.id === productId) return { ...item, amount };
        else return item;
      });
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

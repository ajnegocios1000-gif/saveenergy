
export interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface Lead {
  id: string;
  created_at: string;
  fullName: string;
  email: string;
  phone: string;
  cpf: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  faturaBase64?: string;
  extracted?: any;
  status: 'new' | 'executed';
  value: number;
  commission: number;
  notes?: string;
}

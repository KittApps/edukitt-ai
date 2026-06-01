export interface Model {
    id?: number;
    name: string;
    model_id: string;
    input_price_per_million: number | null;
    output_price_per_million: number | null;
    is_active: boolean;
}

export interface Provider {
    id?: number;
    name: string;
    slug: string;
    api_key: string;
    is_active: boolean;
    models: Model[];
}

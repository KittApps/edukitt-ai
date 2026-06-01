import BuyCreditsCard from './BuyCreditsCard';
import type { CreditPack } from './types';

interface Props {
    packs: CreditPack[];
}

export default function CreditsTab({ packs }: Props) {
    return (
        <div className="space-y-8">
            <BuyCreditsCard packs={packs} />
        </div>
    );
}

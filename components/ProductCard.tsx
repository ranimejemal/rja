import Link from "next/link";
import Image from "next/image";
import type { ProductCardData } from "@/lib/catalog";
import { thumbnailUrl } from "@/lib/catalog";
import { Badge, CUSTOMIZATION_LABEL, Price, Rating, SellerBadge } from "./ui";

export function ProductCard({ p }: { p: ProductCardData }) {
  const isPlatform = p.ownership === "platform";
  return (
    <Link href={`/products/${p.slug}`} className="product-card" data-reveal="">
      <Image className="thumb" src={thumbnailUrl(p.thumbnail_path)} alt="" width={600} height={400} />
      <div className="body">
        <div className="badges">
          <SellerBadge isPlatform={isPlatform} />
          {p.customization_mode !== "ready_to_use" && <Badge>{CUSTOMIZATION_LABEL[p.customization_mode]}</Badge>}
          {p.is_demo && <Badge kind="demo">Demo data</Badge>}
        </div>
        <h3 className="h3">{p.name}</h3>
        <p className="small muted">{p.short_description}</p>
        <div className="badges">
          {p.category && <Badge>{p.category.name}</Badge>}
          {p.integrations.slice(0, 3).map((i) => <Badge key={i}>{i}</Badge>)}
          {p.integrations.length > 3 && <Badge>+{p.integrations.length - 3}</Badge>}
        </div>
        <div className="meta">
          <div className="stack" style={{ "--gap": "0.15rem" } as React.CSSProperties}>
            <span className="tiny muted">by {p.seller?.display_name ?? "Unknown seller"}</span>
            <Rating avg={p.rating_avg} count={p.rating_count} />
          </div>
          <div className="stack" style={{ "--gap": "0.1rem", alignItems: "flex-end" } as React.CSSProperties}>
            <Price minor={p.price_minor} currency={p.currency} />
            {p.sales_count > 0 && !p.is_demo && <span className="tiny muted">{p.sales_count} sales</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products, cols = 3 }: { products: ProductCardData[]; cols?: number }) {
  return (
    <div className="grid" style={{ "--cols": cols } as React.CSSProperties}>
      {products.map((p) => <ProductCard key={p.id} p={p} />)}
    </div>
  );
}

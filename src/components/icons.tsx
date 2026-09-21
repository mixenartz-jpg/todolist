/*
 * İkon dili.
 *
 * Kütüphane yok — beş rota ve birkaç eylem için bir paket taşımanın
 * anlamı yok. Kurallar: 16 birimlik kare viewBox, `currentColor`,
 * 1.3-1.6 çizgi kalınlığı, yuvarlak uçlar, `aria-hidden`.
 *
 * `size` yalnızca ölçeği değiştirir; çizgi kalınlığı viewBox ile
 * birlikte büyür, bu yüzden büyük boyutta ikonlar kalınlaşmaz —
 * boş durumdaki 22px ile gezinmedeki 16px aynı aileden görünür.
 */

interface IconProps {
  size?: number;
}

function svgProps(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none" as const,
    "aria-hidden": true,
  };
}

/** Tablo / matris. */
export function GridIcon({ size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path
        d="M2 4h12M2 8h12M2 12h12M6 2v12M11 2v12"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Bugün / tamamlandı. */
export function CheckIcon({ size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path
        d="M3 8.5l3 3 7-7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** İstatistik. */
export function ChartIcon({ size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path
        d="M2.5 13.5V9M6.5 13.5V4M10.5 13.5v-6M14 13.5V6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Planlama / hedef.
 *
 * İç içe iki çember ve merkez nokta — "nişan alınan şey". Tablodan
 * ayrışması kritik: ikisi alt çubukta komşudur ve Tablo bir ızgara,
 * bu ise bir hedeftir.
 */
export function TargetIcon({ size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="0.9" fill="currentColor" />
    </svg>
  );
}

/** Rutin listesi. */
export function ListIcon({ size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path
        d="M6 4h8M6 8h8M6 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

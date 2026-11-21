/*
 * Carte « Marge » de l'onglet Master Print du projet (admin) — ajout 20/11/2026.
 * Achat HT = commandes Master Print non annulées du projet (réelles d'abord,
 * sinon bac à sable), vente HT = prix du projet, marge en € et en % de la vente
 * (rouge si négative), et la facture d'achat PDF de chaque commande facturée.
 * Calcul : `projectMargin()` (src/utils/masterPrintOrders.ts, testé).
 */
import type { MpOrderView } from '@/@types/masterPrint';
import { fmtEur } from '@/utils/masterPrint';
import { invoiceOrders, projectMargin } from '@/utils/masterPrintOrders';
import InvoiceButton from './InvoiceButton';
import {
  Pill,
  SANDBOX_TONE,
  card,
  grid,
  label,
  muted,
  sectionTitle,
} from './ui';

type Props = {
  price: number | null;
  orders: MpOrderView[];
  /** Environnement de la clé du serveur : seules ses factures sont lisibles. */
  environment: string | null;
};

const Figure = ({
  title,
  value,
  hint,
  color,
}: {
  title: string;
  value: string;
  hint?: string;
  color?: string;
}) => (
  <div style={{ minWidth: 0 }}>
    <p style={label}>{title}</p>
    <p style={{ fontSize: '17px', fontWeight: 700, color: color || '#fff' }}>
      {value}
    </p>
    {hint && <p style={{ ...muted, fontSize: '11.5px' }}>{hint}</p>}
  </div>
);

const MarginCard = ({ price, orders, environment }: Props) => {
  const m = projectMargin(price, orders);
  const invoices = invoiceOrders(orders, environment);
  if (m.state === 'none' && !invoices.length) return null;

  const negative = m.state === 'ok' && m.margin.negative;
  const sandbox = m.state !== 'none' && m.purchase.environment === 'sandbox';

  return (
    <div
      style={{
        ...card,
        ...(negative ? { border: '1.5px solid rgba(239,68,68,0.45)' } : {}),
      }}
      data-testid="master-print-margin"
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '10px',
        }}
      >
        <h3 style={{ ...sectionTitle, margin: 0 }}>Marge</h3>
        {sandbox && <Pill tone={SANDBOX_TONE}>Essai</Pill>}
      </div>

      {m.state !== 'none' && (
        <div style={grid(150)}>
          <Figure
            title="Achat HT"
            value={fmtEur(m.purchase.amount)}
            hint={
              m.purchase.orders > 1
                ? `${m.purchase.orders} commandes Master Print`
                : '1 commande Master Print'
            }
          />
          <Figure
            title="Vente HT"
            value={m.state === 'ok' ? fmtEur(m.sale) : '—'}
            hint="prix du projet"
          />
          <Figure
            title="Marge"
            value={m.state === 'ok' ? fmtEur(m.margin.amount) : '—'}
            hint={
              m.state === 'ok'
                ? `${m.margin.rate.toLocaleString('fr-FR')} % de la vente`
                : undefined
            }
            color={
              m.state !== 'ok' ? undefined : negative ? '#fca5a5' : '#86efac'
            }
          />
        </div>
      )}

      {m.state === 'no_price' && (
        <p style={{ ...muted, marginTop: '8px' }}>
          Prix du projet non renseigné : marge non calculée.
        </p>
      )}
      {negative && (
        <p style={{ ...muted, marginTop: '8px', color: '#fca5a5' }}>
          Marge négative : le projet est vendu moins cher qu’il n’est acheté.
        </p>
      )}
      {sandbox && (
        <p style={{ ...muted, marginTop: '8px' }}>
          Bac à sable : montants simulés, rien n’est facturé.
        </p>
      )}

      {!!invoices.length && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '12px',
          }}
        >
          {invoices.map((o) => (
            <InvoiceButton
              key={o.orderId}
              orderId={o.orderId}
              label={
                invoices.length > 1
                  ? `Facture ${o.invoiceNumber} (PDF)`
                  : 'Facture d’achat (PDF)'
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MarginCard;

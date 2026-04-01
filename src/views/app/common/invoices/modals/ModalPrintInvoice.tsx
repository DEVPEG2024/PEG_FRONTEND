import { useState, useEffect } from 'react';
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
  pdf,
} from '@react-pdf/renderer';
import dayjs from 'dayjs';
import { Dialog } from '@/components/ui';
import { paymentModeData } from '../constants';
import { OrderItem } from '@/@types/orderItem';
import { VAT_AMOUNT } from './ModalEditInvoice';
import { Invoice } from '@/@types/invoice';
import { countries } from '@/constants/countries.constant';

const safeAmount = (val: any) => {
  const n = Number(val);
  return Number.isFinite(n)
    ? n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0,00';
};

// Composant Document PDF séparé
const InvoicePDF = ({
  selectedInvoice,
  logoUrl,
}: {
  selectedInvoice: Invoice;
  logoUrl: string;
}) => {
  const customer = selectedInvoice?.customer;
  const companyInfo = customer?.companyInformations;

  const textPaymentMethod = paymentModeData.find(
    (item: any) => item.value === selectedInvoice?.paymentMethod
  )?.label ?? '';

  const isAutoLiquidation = companyInfo?.country && companyInfo.country !== 'FR';

  return (
    <Document>
      <Page size="A4">
        <View style={styles.page}>
          <View style={styles.section}>
            {logoUrl ? (
              <Image src={logoUrl} style={{ width: '200px', height: '70px' }} />
            ) : null}
            <Text style={{ fontSize: 14, marginTop: 10, fontWeight: 700 }}>
              NOVA 2.0
            </Text>
            <Text style={{ fontSize: 10, marginTop: 3 }}>3 rue du bois arquet</Text>
            <Text style={{ fontSize: 10, marginTop: 3 }}>74140 DOUVAINE</Text>
            <Text style={{ fontSize: 10, marginTop: 3 }}>France</Text>
            <Text style={{ fontSize: 10, marginTop: 3 }}>Email : contact@hellonova.fr</Text>
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <View style={styles.section2}>
                <Text style={{ fontWeight: 'bold', fontSize: 10, padding: 3 }}>
                  Mode de paiement :
                </Text>
              </View>
              <View style={styles.section5}>
                <Text style={{ fontSize: 10, padding: 3 }}>{textPaymentMethod}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <View style={styles.section2}>
                <Text style={{ fontSize: 10, padding: 3 }}>{"Date d'échéance : "}</Text>
              </View>
              <View style={styles.section5}>
                <Text style={{ fontSize: 10, padding: 3 }}>
                  {selectedInvoice?.dueDate ? dayjs(selectedInvoice.dueDate).format('DD.MM.YYYY') : ''}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ margin: 20 }}>
            <View style={styles.section1}>
              <Text style={{ fontSize: 19, padding: 7, textAlign: 'center' }}>FACTURE</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <View style={styles.section2}>
                <Text style={{ fontSize: 10, padding: 7, textAlign: 'center' }}>FACTURE N°</Text>
              </View>
              <View style={styles.section2}>
                <Text style={{ fontSize: 10, padding: 7, textAlign: 'center' }}>Date</Text>
              </View>
              <View style={styles.section2}>
                <Text style={{ fontSize: 10, padding: 7, textAlign: 'center' }}>Client</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <View style={styles.section3}>
                <Text style={{ fontSize: 10, textAlign: 'center' }}>{selectedInvoice?.name ?? ''}</Text>
              </View>
              <View style={styles.section3}>
                <Text style={{ fontSize: 10, textAlign: 'center' }}>
                  {selectedInvoice?.date ? dayjs(selectedInvoice.date).format('DD.MM.YYYY') : ''}
                </Text>
              </View>
              <View style={styles.section3}>
                <Text style={{ fontSize: 10, textAlign: 'center' }}>{customer?.name ?? ''}</Text>
              </View>
            </View>
            <View style={styles.section4}>
              <Text style={{ fontSize: 14, marginTop: 10, fontWeight: 700 }}>{customer?.name ?? ''}</Text>
              <Text style={{ fontSize: 10, marginTop: 3 }}>{companyInfo?.address ?? ''}</Text>
              <Text style={{ fontSize: 10, marginTop: 3 }}>
                {(companyInfo?.zipCode ?? '') + ', ' + (companyInfo?.city ?? '')}
              </Text>
              <Text style={{ fontSize: 10, marginTop: 3 }}>
                {countries.find((c) => c.value === companyInfo?.country)?.label ?? ''}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.page2}>
          <View style={styles.section10}>
            <View style={{ flexDirection: 'row', width: '100%' }}>
              <View style={styles.section11}><Text style={{ fontSize: 8, padding: 4 }}>Réf</Text></View>
              <View style={styles.section12}><Text style={{ fontSize: 8, padding: 4 }}>Produit</Text></View>
              <View style={styles.section15}><Text style={{ fontSize: 8, padding: 4 }}>Qté</Text></View>
              <View style={styles.section11}><Text style={{ fontSize: 8, padding: 4 }}>P.U. HT</Text></View>
              <View style={styles.section15}><Text style={{ fontSize: 8, padding: 4 }}>TVA</Text></View>
              <View style={styles.section11}><Text style={{ fontSize: 8, padding: 4 }}>Total HT</Text></View>
            </View>
            {(selectedInvoice?.orderItems ?? []).map((orderItem: OrderItem, i: number) => {
              const total = Number(orderItem?.price) || 0;
              const qty = Array.isArray(orderItem?.sizeAndColorSelections)
                ? orderItem.sizeAndColorSelections.reduce((q: number, sel: any) => q + (Number(sel?.quantity) || 0), 0)
                : 0;
              return (
                <View style={{ flexDirection: 'row', width: '100%', borderBottom: 1, borderColor: '#ECECEC' }} key={i}>
                  <View style={styles.section13}><Text style={{ fontSize: 8, padding: 4 }}>{i + 1}</Text></View>
                  <View style={styles.section14}><Text style={{ fontSize: 8, padding: 4 }}>{orderItem?.product?.name ?? ''}</Text></View>
                  <View style={styles.section16}><Text style={{ fontSize: 8, padding: 4, textAlign: 'right' }}>{qty}</Text></View>
                  <View style={styles.section13}><Text style={{ fontSize: 8, padding: 4, textAlign: 'right' }}>{safeAmount(orderItem?.price)} €</Text></View>
                  <View style={styles.section16}><Text style={{ fontSize: 8, padding: 4, textAlign: 'right' }}>{selectedInvoice?.vatAmount && selectedInvoice?.amount ? `${Math.round((selectedInvoice.vatAmount / selectedInvoice.amount) * 100)}%` : '0%'} </Text></View>
                  <View style={styles.section13}><Text style={{ fontSize: 8, padding: 4, textAlign: 'right' }}>{total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</Text></View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.page}>
          <View style={styles.sectionTTC}>
            <View style={{ flexDirection: 'row', marginTop: 5 }}>
              <View style={styles.section2}><Text style={{ fontSize: 10, padding: 3 }}>TOTAL HT : </Text></View>
              <View style={styles.section5}><Text style={{ fontSize: 10, padding: 3, textAlign: 'right' }}>{safeAmount(selectedInvoice?.amount)} €</Text></View>
            </View>
            {isAutoLiquidation ? (
              <View style={{ flexDirection: 'row', marginTop: 2 }}>
                <View style={{ ...styles.section2, width: 200 }}>
                  <Text style={{ fontSize: 9, padding: 3 }}>TVA autoliquidation</Text>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', marginTop: 2 }}>
                <View style={styles.section2}>
                  <Text style={{ fontSize: 10, padding: 3 }}>
                    TVA {(Number(selectedInvoice?.vatAmount) || 0) > 0 ? VAT_AMOUNT : 0} %
                  </Text>
                </View>
                <View style={styles.section5}>
                  <Text style={{ fontSize: 10, padding: 3, textAlign: 'right' }}>{safeAmount(selectedInvoice?.vatAmount)} €</Text>
                </View>
              </View>
            )}
            <View style={{ flexDirection: 'row', marginTop: 2 }}>
              <View style={styles.section2}>
                <Text style={{ fontSize: 12, padding: 3 }}>{isAutoLiquidation ? 'Total HT :' : 'Total TTC :'} </Text>
              </View>
              <View style={styles.section5}>
                <Text style={{ fontSize: 12, padding: 3, textAlign: 'right' }}>
                  {isAutoLiquidation ? safeAmount(selectedInvoice?.amount) : safeAmount(selectedInvoice?.totalAmount)} €
                </Text>
              </View>
            </View>
            {isAutoLiquidation && (
              <Text style={{ fontSize: 8, marginTop: 6, fontStyle: 'italic' }}>
                Autoliquidation de la TVA - Article 283-2 du CGI
              </Text>
            )}
          </View>
        </View>

        <View style={styles.page}>
          <View style={styles.section}>
            <Text style={{ fontSize: 10, padding: 3 }}>IBAN: FR76 1679 8000 0100 0178 1163 397</Text>
            <Text style={{ fontSize: 10, padding: 3 }}>BIC: TRZOFR21XXX</Text>
          </View>
        </View>

        <View style={{ marginLeft: 20, marginRight: 20, marginTop: 10 }}>
          <Text style={{ fontSize: 8, fontWeight: 'bold', marginBottom: 4 }}>Conditions de paiement</Text>
          <Text style={{ fontSize: 7, lineHeight: 1.4 }}>
            {"Un acompte de 50 % du montant total TTC est exigé à la validation de la commande afin de confirmer celle-ci et de permettre le lancement de la production."}
          </Text>
          <Text style={{ fontSize: 7, lineHeight: 1.4, marginTop: 2 }}>
            {"Le solde de 50 % est payable à la fin du chantier, à réception des travaux ou avant la livraison des produits."}
          </Text>
          <Text style={{ fontSize: 7, lineHeight: 1.4, marginTop: 2 }}>
            {"La commande ne sera considérée comme ferme et définitive qu'à réception de l'acompte."}
          </Text>
        </View>

        <View style={styles.sectionFooter}>
          <Text style={{ fontSize: 6, padding: 3, textAlign: 'center' }}>NOVA 2.0</Text>
          <Text style={{ fontSize: 6, padding: 3, textAlign: 'center' }}>Siret: 94333576000014</Text>
          <Text style={{ fontSize: 6, padding: 3, textAlign: 'center' }}>TVA: FR88943335760</Text>
          <Text style={{ fontSize: 6, padding: 3, textAlign: 'center' }}>
            {"Pas d'escompte en cas de paiement anticipé. - Pénalités pour retard de paiement : 3 fois le taux d'intérêt légal - Indemnité forfaitaire pour frais de recouvrement en cas de retard de paiement : 40,00 €"}
          </Text>
          <Text style={{ fontSize: 6, padding: 3, textAlign: 'center' }}>
            {"RESERVE DE PROPRIETE : Nous nous réservons la propriété des marchandises jusqu'au paiement du prix par l'acheteur. Notre droit de revendication porte aussi bien sur les marchandises que sur leur prix si elles ont déjà été revendues (Loi du 12 mai 1980)"}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

const ModalPrintInvoice = ({
  printInvoiceDialog,
  selectedInvoice,
  setPrintInvoiceDialog,
  setSelectedInvoice,
  dispatch,
}: {
  printInvoiceDialog: boolean;
  selectedInvoice: Invoice;
  setPrintInvoiceDialog: (printInvoiceDialog: boolean) => any;
  setSelectedInvoice: (invoice: Invoice | null) => any;
  dispatch: (fonction: any) => any;
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const generatePdf = async () => {
      try {
        setLoading(true);
        setPdfError(null);

        // Charger le logo en data URL
        let logoUrl = '';
        try {
          const res = await fetch('/img/logo/logo-nova.png');
          const blob = await res.blob();
          logoUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch {}

        if (cancelled) return;

        // Générer le PDF en blob
        const doc = <InvoicePDF selectedInvoice={selectedInvoice} logoUrl={logoUrl} />;
        const blob = await pdf(doc).toBlob();

        if (cancelled) return;

        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch (e: any) {
        if (!cancelled) {
          setPdfError(e?.message ?? 'Erreur lors de la génération du PDF');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    generatePdf();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedInvoice?.documentId]);

  const handleClose = () => {
    dispatch(setPrintInvoiceDialog(false));
    dispatch(setSelectedInvoice(null));
  };

  return (
    <Dialog isOpen={printInvoiceDialog} onClose={handleClose} width={800}>
      <h3 className="text-center text-2xl font-bold">
        Facture N° {selectedInvoice?.name ?? ''}
      </h3>
      <div className="flex flex-col justify-between mt-4">
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
            Génération du PDF en cours...
          </div>
        )}
        {pdfError && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#f87171' }}>
            <p>Erreur : {pdfError}</p>
          </div>
        )}
        {pdfUrl && (
          <iframe
            src={pdfUrl}
            style={{ width: '100%', height: '700px', border: 'none', borderRadius: '8px' }}
            title={`Facture ${selectedInvoice?.name ?? ''}`}
          />
        )}
      </div>
    </Dialog>
  );
};

const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  page2: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#fff',
    marginLeft: 20,
    marginRight: 20,
    borderWidth: 1,
    borderRadius: 2,
    borderColor: '#ECECEC',
  },
  section: {
    margin: 20,
    flexGrow: 1,
  },
  sectionFooter: {
    margin: 20,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  sectionTTC: {
    margin: 20,
    flexGrow: 1,
    alignItems: 'flex-end',
  },
  section10: {
    flexGrow: 1,
  },
  section1: {
    borderWidth: 1,
    borderRadius: 2,
    width: '100%',
    marginBottom: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#ECECEC',
    backgroundColor: '#ECECEC',
  },
  section4: {
    borderWidth: 1,
    borderRadius: 2,
    width: '100%',
    padding: 15,
    marginTop: 25,
    justifyContent: 'center',
    borderColor: '#ECECEC',
    backgroundColor: '#FFFFFF',
  },
  section2: {
    borderWidth: 1,
    borderRadius: 2,
    width: '100px',
    borderColor: '#ECECEC',
    backgroundColor: '#ECECEC',
  },
  section11: {
    borderWidth: 1,
    width: '10%',
    borderColor: '#FFF',
    backgroundColor: '#ECECEC',
  },
  section13: {
    width: '10%',
    backgroundColor: '#FFF',
  },
  section15: {
    borderWidth: 1,
    width: '5%',
    borderColor: '#FFF',
    backgroundColor: '#ECECEC',
  },
  section16: {
    width: '5%',
    backgroundColor: '#FFF',
  },
  section12: {
    borderWidth: 1,
    width: '60%',
    borderColor: '#FFF',
    backgroundColor: '#ECECEC',
  },
  section14: {
    width: '60%',
    backgroundColor: '#FFF',
  },
  section5: {
    borderWidth: 1,
    borderRadius: 2,
    width: '100px',
    borderColor: '#ECECEC',
    backgroundColor: '#FFFFFF',
  },
  section3: {
    borderWidth: 1,
    borderRadius: 2,
    padding: 8,
    justifyContent: 'center',
    width: '100px',
    borderColor: '#ECECEC',
    backgroundColor: '#FFF',
  },
});

export default ModalPrintInvoice;

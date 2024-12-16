import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  PDFViewer,
  Image,
  Font,
} from '@react-pdf/renderer';
import QRCode from 'qrcode';
import dayjs from 'dayjs';
import { Dialog } from '@/components/ui';
import { useAppSelector } from '@/store';
import { InvoiceOld } from '@/@types/invoice';
import { paymentModeData } from '../constants';
import { API_BASE_URL, API_URL_IMAGE } from '@/configs/api.config';

const ModalPrintInvoice = ({
  isOpen,
  onClose,
  invoice,
}: {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceOld;
}) => {
  const user = invoice.sellerId;
  const order = invoice;
  const [qrcod, setQrcode] = useState('');

  useEffect(() => {
    Font.register({
      family: 'Roboto',
      fonts: [
        {
          src: '../../../../assets/fonts/Roboto/Roboto-Regular.ttf',
        },
        {
          src: '../../../../assets/fonts/Roboto/Roboto-Bold.ttf',
          fontWeight: 'bold',
        },
        {
          src: '../../../../assets/fonts/Roboto/Roboto-Italic.ttf',
          fontWeight: 'normal',
          fontStyle: 'italic',
        },
        {
          src: '../../../../assets/fonts/Roboto/Roboto-BoldItalic.ttf',
          fontWeight: 'bold',
          fontStyle: 'italic',
        },
      ],
    });
    QRCode.toDataURL(invoice?._id.toString()).then(setQrcode);
  }, [invoice?._id]);
  const textPaymentMethod = paymentModeData.find(
    (item: any) => item.value === invoice?.paymentMethod
  )?.label;
  return (
    <>
      <Dialog isOpen={isOpen} onClose={onClose} width={800}>
        <h3 className="text-center text-2xl font-bold">
          Facture N° {invoice?.invoiceNumber}
        </h3>
        <div className="flex flex-col justify-between mt-4">
          <PDFViewer style={{ width: '100%', height: '700px' }}>
            <Document>
              <Page size="A4">
                <View style={styles.page}>
                  <View style={styles.section}>
                    <Image
                      src={API_URL_IMAGE + user?.logo}
                      style={{ width: '200px', height: '70px' }}
                    />
                    <Text
                      style={{ fontSize: 10, marginTop: 10, fontWeight: 700 }}
                    >
                      {user?.companyName}
                    </Text>
                    <Text style={{ fontSize: 10, marginTop: 3 }}>
                      {user?.address}
                    </Text>
                    <Text style={{ fontSize: 10, marginTop: 3 }}>
                      {user?.zip + ', ' + user?.city}
                    </Text>
                    <Text style={{ fontSize: 10, marginTop: 3 }}>
                      Siret : {user?.siret}
                    </Text>
                    <Text style={{ fontSize: 10, marginTop: 3 }}>
                      N° TVA : {user?.vat}
                    </Text>
                    <Text style={{ fontSize: 10, marginTop: 3 }}>
                      Tél : {user?.phone}
                    </Text>
                    <Text style={{ fontSize: 10, marginTop: 3 }}>
                      Email : {user?.email}
                    </Text>
                    <View style={{ flexDirection: 'row', marginTop: 10 }}>
                      <View style={styles.section2}>
                        <Text
                          style={{
                            fontWeight: 'bold',
                            fontSize: 10,
                            padding: 3,
                          }}
                        >
                          Mode de paiement :
                        </Text>
                      </View>
                      <View style={styles.section5}>
                        <Text style={{ fontSize: 10, padding: 3 }}>
                          {textPaymentMethod}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                      <View style={styles.section2}>
                        <Text style={{ fontSize: 10, padding: 3 }}>
                          Date d'échéance :{' '}
                        </Text>
                      </View>
                      <View style={styles.section5}>
                        <Text style={{ fontSize: 10, padding: 3 }}>
                          {dayjs(invoice?.dueDate).format('DD.MM.YYYY')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ margin: 20 }}>
                    <View style={styles.section1}>
                      <Text
                        style={{
                          fontSize: 19,
                          padding: 7,
                          textAlign: 'center',
                        }}
                      >
                        FACTURE
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                      <View style={styles.section2}>
                        <Text
                          style={{
                            fontSize: 10,
                            padding: 7,
                            textAlign: 'center',
                          }}
                        >
                          FACTURE N°
                        </Text>
                      </View>
                      <View style={styles.section2}>
                        <Text
                          style={{
                            fontSize: 10,
                            padding: 7,
                            textAlign: 'center',
                          }}
                        >
                          Date
                        </Text>
                      </View>
                      <View style={styles.section2}>
                        <Text
                          style={{
                            fontSize: 10,
                            padding: 7,
                            textAlign: 'center',
                          }}
                        >
                          Client
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                      <View style={styles.section3}>
                        <Text style={{ fontSize: 10, textAlign: 'center' }}>
                          {invoice?.invoiceNumber}
                        </Text>
                      </View>
                      <View style={styles.section3}>
                        <Text style={{ fontSize: 10, textAlign: 'center' }}>
                          {dayjs(invoice?.invoiceDate).format('DD.MM.YYYY')}
                        </Text>
                      </View>
                      <View style={styles.section3}>
                        <Text style={{ fontSize: 10, textAlign: 'center' }}>
                          {invoice?.customerId._id.slice(0, 5).toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.section4}>
                      <Text
                        style={{
                          fontSize: 14,
                          padding: 7,
                          textAlign: 'center',
                        }}
                      >
                        {invoice?.customerId.companyName}
                      </Text>
                      <Text
                        style={{
                          fontSize: 10,
                          padding: 7,
                          textAlign: 'center',
                        }}
                      >
                        {invoice?.customerId.address}
                      </Text>
                      <Text
                        style={{
                          fontSize: 10,
                          padding: 7,
                          textAlign: 'center',
                        }}
                      >
                        {invoice?.customerId.zip +
                          ' - ' +
                          invoice?.customerId.city}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.page2}>
                  <View style={styles.section10}>
                    <View style={{ flexDirection: 'row', width: '100%' }}>
                      <View style={styles.section11}>
                        <Text style={{ fontSize: 8, padding: 4 }}>Réf</Text>
                      </View>
                      <View style={styles.section12}>
                        <Text style={{ fontSize: 8, padding: 4 }}>Produit</Text>
                      </View>
                      <View style={styles.section15}>
                        <Text style={{ fontSize: 8, padding: 4 }}>Qté</Text>
                      </View>
                      <View style={styles.section11}>
                        <Text style={{ fontSize: 8, padding: 4 }}>P.U. HT</Text>
                      </View>
                      <View style={styles.section15}>
                        <Text style={{ fontSize: 8, padding: 4 }}>TVA</Text>
                      </View>
                      <View style={styles.section11}>
                        <Text style={{ fontSize: 8, padding: 4 }}>
                          Total HT
                        </Text>
                      </View>
                    </View>
                    {invoice?.items.map((order: any, i: number) => {
                      let total = order?.price * order?.quantity;
                      return (
                        <View
                          style={{
                            flexDirection: 'row',
                            width: '100%',
                            borderBottom: 1,
                            borderColor: '#ECECEC',
                          }}
                          key={i}
                        >
                          <View style={styles.section13}>
                            <Text style={{ fontSize: 8, padding: 4 }}>
                              {i + 1}
                            </Text>
                          </View>
                          <View style={styles.section14}>
                            <Text style={{ fontSize: 8, padding: 4 }}>
                              {order?.name}
                            </Text>
                          </View>
                          <View style={styles.section16}>
                            <Text
                              style={{
                                fontSize: 8,
                                padding: 4,
                                textAlign: 'right',
                              }}
                            >
                              {order?.quantity}
                            </Text>
                          </View>
                          <View style={styles.section13}>
                            <Text
                              style={{
                                fontSize: 8,
                                padding: 4,
                                textAlign: 'right',
                              }}
                            >
                              {order?.price.toFixed(2)} €
                            </Text>
                          </View>
                          <View style={styles.section16}>
                            <Text
                              style={{
                                fontSize: 8,
                                padding: 4,
                                textAlign: 'right',
                              }}
                            >
                              20%{' '}
                            </Text>
                          </View>
                          <View style={styles.section13}>
                            <Text
                              style={{
                                fontSize: 8,
                                padding: 4,
                                textAlign: 'right',
                              }}
                            >
                              {total.toFixed(2)} €
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
                <View style={styles.page}>
                  <View style={styles.section}>
                    <View style={{ flexDirection: 'row' }}>
                      <View style={styles.section22}>
                        <Image
                          source={qrcod}
                          style={{ width: '100px', paddingRight: 5 }}
                        />
                      </View>
                      <View style={styles.section00}></View>
                    </View>
                  </View>

                  <View style={styles.sectionTTC}>
                    <View style={{ flexDirection: 'row', marginTop: 5 }}>
                      <View style={styles.section2}>
                        <Text style={{ fontSize: 10, padding: 3 }}>
                          TOTAL HT :{' '}
                        </Text>
                      </View>
                      <View style={styles.section5}>
                        <Text
                          style={{
                            fontSize: 10,
                            padding: 3,
                            textAlign: 'right',
                          }}
                        >
                          {invoice?.amount.toFixed(2)} €
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', marginTop: 2 }}>
                      <View style={styles.section2}>
                        <Text style={{ fontSize: 10, padding: 3 }}>
                          TVA {invoice?.vat > 0 ? '20%' : '0%'} :{' '}
                        </Text>
                      </View>
                      <View style={styles.section5}>
                        <Text
                          style={{
                            fontSize: 10,
                            padding: 3,
                            textAlign: 'right',
                          }}
                        >
                          {invoice?.vatAmount.toFixed(2)} €
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', marginTop: 2 }}>
                      <View style={styles.section2}>
                        <Text style={{ fontSize: 12, padding: 3 }}>
                          Total TTC :{' '}
                        </Text>
                      </View>
                      <View style={styles.section5}>
                        <Text
                          style={{
                            fontSize: 12,
                            padding: 3,
                            textAlign: 'right',
                          }}
                        >
                          {order?.totalAmount.toFixed(2)} €
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.sectionFooter}>
                  <Text
                    style={{ fontSize: 6, padding: 3, textAlign: 'center' }}
                  >
                    {user?.companyName +
                      ' - ' +
                      user?.address +
                      ' - ' +
                      user?.zip +
                      ', ' +
                      user?.city}{' '}
                    - RCS : {user?.siret} - N° TVA : {user?.vat}
                  </Text>
                  <Text
                    style={{ fontSize: 6, padding: 3, textAlign: 'center' }}
                  >
                    Pas d'escompte en cas de paiement anticipé. - Pénalités pour
                    retard de paiement : 3 fois le taux d'intérêt légal -
                    Indemnité forfaitaire pour frais de recouvrement en cas de
                    retard de paiement : 40,00 €
                  </Text>
                  <Text
                    style={{ fontSize: 6, padding: 3, textAlign: 'center' }}
                  >
                    RESERVE DE PROPRIETE : Nous nous réservons la propriété des
                    marchandises jusqu'au paiement du prix par l'acheteur. Notre
                    droit de revendication porte aussi bien sur les marchandises
                    que sur leur prix si elles ont déjà été revendues (Loi du 12
                    mai 1980)
                  </Text>
                </View>
              </Page>
            </Document>
          </PDFViewer>
        </div>
      </Dialog>
    </>
  );
};

const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    with: '100%',
    backgroundColor: '#FFFFFF',
  },
  page2: {
    flexDirection: 'row',
    with: '100%',
    backgroundColor: '#fff',
    marginLeft: 20,
    marginRight: 20,
    borderWidth: 1,
    borderRadius: 2,
    borderColor: '#ECECEC',
  },
  text: {
    fontSize: 10,
    marginTop: 10,
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
    with: '100%',
    marginBottom: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#ECECEC',
    backgroundColor: '#ECECEC',
  },
  section4: {
    borderWidth: 1,
    borderRadius: 2,
    with: '100%',
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
  section22: {
    borderWidth: 1,
    padding: 3,
    borderRadius: 2,
    borderColor: '#ECECEC',
    backgroundColor: '#FFFFFF',
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
  section00: {
    borderWidth: 1,
    borderRadius: 2,
    width: '250px',
    height: '100px',
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

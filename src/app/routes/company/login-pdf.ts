import { PDFDocument, StandardFonts } from 'pdf-lib';

export async function createLoginPdf(
  template: ArrayBuffer,
  companyName: string,
  companyKey: string,
  companyPin?: string
): Promise<Uint8Array> {
  const document = await PDFDocument.load(template);
  const form = document.getForm();
  const font = await document.embedFont(StandardFonts.HelveticaBold);

  const fields: [string, string, number][] = [
    ['COMPANY-NAME', companyName, 18],
    ['COMPANY-KEY', companyKey, 14.04],
  ];
  if (companyPin !== undefined) {
    fields.push(['COMPANY-PIN', companyPin, 14.04]);
  }

  for (const [fieldName, value, preferredSize] of fields) {
    const field = form.getTextField(fieldName);
    const width = Math.min(...field.acroField.getWidgets().map(widget => widget.getRectangle().width)) - 8;
    const textWidth = font.widthOfTextAtSize(value, preferredSize);
    field.setText(value);
    field.setFontSize(textWidth > width ? preferredSize * width / textWidth : preferredSize);
    field.updateAppearances(font);
  }

  form.flatten();
  return document.save();
}

export function loginFilename(companyName: string, audience: 'Lärare' | 'Elev'): string {
  const name = companyName.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim().replace(/[. ]+$/, '');
  return `${name || 'Företag'}-Login-${audience}.pdf`;
}

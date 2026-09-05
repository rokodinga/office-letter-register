# Kodinga Range public data

The Range Information Centre reads the public workbook from:

`/data/Kodinga Range Information.xlsx`

Keep the workbook as the source document. The web application parses the workbook in the browser for public viewing and uses the same filtered records for authenticated Excel export, printing, and handbook generation.

The source workbook is public information for Forest Department field staff and the public. App-level export/print controls still require a registered account.

## Updating the data

Replace the workbook at the path above with the latest approved public workbook. Do not rename the file unless `WORKBOOK` in `src/pages/RangeInformationPage.tsx` is updated at the same time.

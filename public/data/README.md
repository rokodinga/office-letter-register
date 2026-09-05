# Kodinga Range public data

The Range Information Centre uses the normalized public dataset at:

`/data/kodinga-range-information.json.gz.b64`

The dataset was generated from the approved source workbook `Kodinga Range Infromation(2).xlsx`. It preserves source sheet and Excel row references so exported records remain traceable to the source document.

The original workbook remains the source/reference document. The compressed normalized dataset is used by the website so the public Centre does not depend on browser-side XLSX parsing or a missing binary asset.

## Scope

The dataset contains 29 information sheets covering forests, plantations, nurseries, villages, VSS, fire points, infrastructure, land recovery, FC Act, FRC, SMC, MGNREGS and related Range information. The detected administrative hierarchy is 2 Sections and 6 Beats.

## Access

Viewing the Range Information Centre is public. Excel export, printing and handbook generation are gated to registered users in the application.

## Updating the data

When a new approved workbook is received, regenerate the normalized dataset and replace the compressed data asset. Keep the source workbook separately as the archival/reference copy. Do not silently correct source values; normalization should preserve the raw source fields and record traceability.

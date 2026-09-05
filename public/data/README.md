# Kodinga Range public data

The Range Information Centre uses the normalized public dataset at:

`/data/kodinga-range-information.json.gz.b64`

The dataset is derived from the approved source workbook `Kodinga Range Infromation(2).xlsx`. Source sheet and Excel row references are preserved so records remain traceable to the source document.

The original workbook remains the archival/reference document. The website uses the compressed normalized dataset so public viewing does not depend on browser-side XLSX parsing or a missing binary asset.

## Scope

The dataset covers all 29 information sheets in the workbook, including forests, plantations, nurseries, villages, VSS, fire points, infrastructure, land recovery, FC Act, FRC, SMC, MGNREGS and related Range information. The detected administrative hierarchy is 2 Sections and 6 Beats.

Section/Beat filters are deliberately conservative: a record is included in a Section or Beat view only when the source-derived normalized record has a matching Section/Beat value. Range-wide records without an explicit assignment remain available in the Complete Range view and are never silently attributed to a Beat.

## Access

Viewing the Range Information Centre is public. Excel export, printing and handbook generation are gated to registered users in the application.

## Updating the data

When a new approved workbook is received, regenerate the normalized dataset and replace the compressed data asset. Keep the source workbook separately as the archival/reference copy. Do not silently correct source values; normalization should preserve raw source fields and source-row traceability.

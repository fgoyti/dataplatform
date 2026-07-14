# L30 Descriptions — Plan

## Overview

Populate the `L30 Description` column in `web/UT Flat - Effective on 2026-07-06.xlsx` for all 642 rows. Each description should be 2–3 sentences written from IBM's product portfolio knowledge. Rows where the L30 name is too vague, internal-only, or ambiguous (e.g. hardware model SKUs, GARS internal codes, "Bob", "Project Willow - Data") are left blank — the app already shows "no information available" for nulls.

The approach: generate all descriptions in-context (Claude already knows this portfolio well), write them into a JSON lookup map keyed by L30 value, then run a Node.js script that patches the existing Excel file using the `xlsx` npm package.

---

## Sub-Tasks

### 1. Generate descriptions for all L30 values

**Intent:** Produce a complete JSON map of `{ "L30 name": "description" }` covering every row where a meaningful description can be written. Use the full hierarchy (L17 > L20 > L30) as context when the L30 name alone is ambiguous.

**Expected Outcomes:**
- A file `l30-descriptions.json` exists at the workspace root containing a JSON object with one key per describable L30 value
- Rows that are too vague, are internal SKU codes (e.g. "6941-12K IBM Z Expert Care - Advanced"), are hardware model numbers (e.g. "z15 T01", "Power10 S1022s Scale-out"), or are ambiguous internal entries are omitted (null in the final Excel)
- All well-known IBM products and services have a 2–3 sentence description

**Categories to cover (from the data):**
- Public Cloud Platform: PaaS, IaaS, Expert Labs & Support, Contracts
- Data Platform: AI Productivity, AI/ML Ops, Data Fabric (Databases, Data Intelligence, Data Integration, Data Lakehouse, Content Management, Data Security), Confluent
- Red Hat: RHEL, OpenShift, Ansible, Red Hat Services
- Automation Platform: Infrastructure Automation (HashiCorp tools, Network Management, IAM/Verify), App Dev & Integration (MQ, API Connect, DataPower, Sterling, webMethods), Security Threat Management (QRadar), TBM/Observability (Instana, Turbonomic, Maximo, Apptio)
- Z TPS: Z App Development, Z App & Data Management, Z IT Operations Management
- Power TPS, IBM Software Cross Brand
- IBM Infrastructure (Z HW, Power HW, Storage HW, Technology Lifecycle Services, GARS)
- Red Hat Marketplace, Talent Management Solutions

**Todo List:**
- [ ] Write descriptions for all Public Cloud Platform L30 entries
- [ ] Write descriptions for all Data Platform L30 entries
- [ ] Write descriptions for all Automation Platform L30 entries
- [ ] Write descriptions for all Red Hat L30 entries
- [ ] Write descriptions for all Z TPS L30 entries
- [ ] Write descriptions for all Storage TPS L30 entries
- [ ] Write descriptions for all IBM Infrastructure (Z HW, Power HW, Storage HW, TLS, GARS) L30 entries
- [ ] Write descriptions for remaining categories (Talent Management, Power TPS, Red Hat Marketplace, Cross Brand)
- [ ] Write the complete map to `l30-descriptions.json`

**Relevant Context:**
- Source data: `.bob/tmp/xlsx-dumps/UT Flat - Effective on 2026-07-06-e2afcd41df468853/Flat_UT.json`
- 642 rows total, L30 is index 4 in each row array
- Many L30 values appear under only one L20 parent; use that context when naming is generic (e.g. "Capture" under "Content Management")
- Intentionally leave blank: internal SKU codes like "6941-xxx", hardware model numbers like "z15 T01" / "Power10 S1022s", GARS internal/broker/intergeo/ICPE codes, "Misc SW related PIDs", "Rental Revenue", "Bob" (AI Assistant), "Project Willow - Data", "Calistoga", "Janes", "Open Core"

**Status:** `[ ] pending`

---

### 2. Write the Excel patch script

**Intent:** Write a Node.js script that reads the existing Excel file, looks up each row's L30 value in `l30-descriptions.json`, sets the `L30 Description` cell to the matched description (or leaves it null if not in the map), and saves the file back in place.

**Expected Outcomes:**
- A script `patch-l30-descriptions.mjs` exists at the workspace root
- Script uses the `xlsx` npm package (already available or installed via `npm install xlsx`)
- Script reads `web/UT Flat - Effective on 2026-07-06.xlsx`, updates column F (index 5) for all data rows, and writes the file back

**Todo List:**
- [ ] Check if `xlsx` npm package is available in the project or needs installing
- [ ] Write `patch-l30-descriptions.mjs`
- [ ] Script reads `l30-descriptions.json` and the existing Excel file
- [ ] Script matches on L30 value (column index 4), writes description to column index 5
- [ ] Script preserves all other data and formatting as much as possible

**Relevant Context:**
- Excel file path: `web/UT Flat - Effective on 2026-07-06.xlsx`
- Sheet name: `Flat UT`
- Headers are in row 1; data starts at row 2
- `L30 Description` is the 6th column (index 5 in 0-based row arrays)

**Status:** `[ ] pending`

---

### 3. Run the script and verify

**Intent:** Execute the patch script and spot-check the output to confirm descriptions were written correctly.

**Expected Outcomes:**
- The Excel file has the `L30 Description` column populated for all known products
- A spot-check of 5–10 rows confirms correct descriptions
- Rows for internal SKUs, hardware model numbers, and ambiguous entries remain blank

**Todo List:**
- [ ] Run `node patch-l30-descriptions.mjs`
- [ ] Re-read a sample of rows from the patched Excel file to verify
- [ ] Confirm null rows are still null where expected

**Relevant Context:**
- Re-read the Excel with `read_xlsx` after patching to verify

**Status:** `[ ] pending`

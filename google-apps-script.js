// ================================================================
// Factory Control — Google Apps Script
// ================================================================
// SETUP INSTRUCTIONS (one-time, ~5 minutes):
//
// 1. Open your Google Sheet (or create a new one at sheets.google.com)
// 2. Click Extensions → Apps Script
// 3. Delete any existing code and paste this entire file
// 4. Click Save (floppy disk icon)
// 5. Click Deploy → New deployment
//    - Type: Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 6. Click Deploy → copy the Web App URL
// 7. In the factory app: Backoffice → Settings → paste the URL → Save
//
// IMPORTANT: Every time you update this script, click Deploy → New deployment
// and paste the new URL into the app settings. The URL changes with each deployment.
//
// That's it. Every time a record is saved, the sheet updates automatically.
// ================================================================

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { sheetName, labels, keys, records, action } = payload;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const props = PropertiesService.getScriptProperties();

    // ── Notification action ──────────────────────────────────────
    if (action === 'notify') {
      // Just acknowledge receipt; email/logging can be added here
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, action: 'notify' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── Send Invitation action ───────────────────────────────────
    if (action === 'send_invite') {
      const { email, token, role, appUrl, sentBy } = payload;
      const SHEET_NAME = 'Invitations';
      let sheet = ss.getSheetByName(SHEET_NAME);
      if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME);
        const headers = ['Token', 'Email', 'Role', 'Status', 'Sent At', 'Sent By', 'Username'];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        const hRange = sheet.getRange(1, 1, 1, headers.length);
        hRange.setBackground('#1d4ed8');
        hRange.setFontColor('#ffffff');
        hRange.setFontWeight('bold');
        hRange.setHorizontalAlignment('center');
        sheet.setFrozenRows(1);
      }

      // Check for duplicate pending invitation
      const data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][1]).toLowerCase() === String(email).toLowerCase() && data[i][3] === 'pending') {
          return ContentService
            .createTextOutput(JSON.stringify({ ok: false, error: 'duplicate' }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }

      sheet.appendRow([token, email, role || 'worker', 'pending', new Date().toISOString(), sentBy || '', '']);

      // Send invitation email
      var inviteLink = (appUrl || 'https://guymaich-jpg.github.io/Aravadistillery-Factory-Control/') + '#/invite/' + token;
      try {
        MailApp.sendEmail({
          to: email,
          subject: 'Invitation — Arava Distillery Factory Control',
          htmlBody: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 16px">'
            + '<h2 style="margin:0 0 8px">Arava Distillery</h2>'
            + '<p style="color:#555;margin:0 0 24px">You have been invited to join the Factory Control system.</p>'
            + '<a href="' + inviteLink + '" style="display:inline-block;padding:12px 28px;background:#2C332F;color:#EFEFEC;text-decoration:none;border-radius:3px;font-weight:600">Create Your Account</a>'
            + '<p style="margin:24px 0 0;font-size:13px;color:#888">If the button doesn\'t work, copy this link:<br>' + inviteLink + '</p>'
            + '</div>',
        });
      } catch (mailErr) {
        // Email sending failed but invitation is stored — log and continue
        Logger.log('Mail error: ' + mailErr.message);
      }

      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, action: 'send_invite' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── Accept Invitation action ─────────────────────────────────
    if (action === 'accept_invite') {
      const { token, username } = payload;
      const SHEET_NAME = 'Invitations';
      var sheet2 = ss.getSheetByName(SHEET_NAME);
      if (sheet2) {
        var data2 = sheet2.getDataRange().getValues();
        for (var j = 1; j < data2.length; j++) {
          if (data2[j][0] === token) {
            sheet2.getRange(j + 1, 4).setValue('accepted');  // Status column
            sheet2.getRange(j + 1, 7).setValue(username || ''); // Username column
            break;
          }
        }
      }
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, action: 'accept_invite' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── Append action (Inventory ledger) ─────────────────────────
    if (action === 'append') {
      let sheet = ss.getSheetByName(sheetName);
      const isNew = !sheet;
      if (isNew) {
        sheet = ss.insertSheet(sheetName);
      }

      if (!labels || labels.length === 0 || !records || records.length === 0) {
        return ContentService
          .createTextOutput(JSON.stringify({ ok: true, action: 'append', rows: 0 }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // Write header if sheet is new or empty
      if (isNew || sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, labels.length).setValues([labels]);
        const hRange = sheet.getRange(1, 1, 1, labels.length);
        hRange.setBackground('#1d4ed8');
        hRange.setFontColor('#ffffff');
        hRange.setFontWeight('bold');
        hRange.setHorizontalAlignment('center');
        hRange.setVerticalAlignment('middle');
        hRange.setWrap(false);
        sheet.setRowHeight(1, 32);
        sheet.setFrozenRows(1);
      }

      // Append data rows after the last existing row
      const startRow = sheet.getLastRow() + 1;
      const rows = records.map(r =>
        keys.map(k => {
          const v = r[k];
          if (v === null || v === undefined) return '';
          if (typeof v === 'boolean') return v ? '✓' : '';
          return String(v);
        })
      );
      sheet.getRange(startRow, 1, rows.length, keys.length).setValues(rows);

      // Alternate row shading for new rows
      for (let i = 0; i < rows.length; i++) {
        const color = (startRow + i) % 2 === 0 ? '#f8fafc' : '#ffffff';
        sheet.getRange(startRow + i, 1, 1, keys.length).setBackground(color);
      }

      // Auto-resize (cap at 220px)
      sheet.autoResizeColumns(1, labels.length);
      for (let c = 1; c <= labels.length; c++) {
        if (sheet.getColumnWidth(c) > 220) sheet.setColumnWidth(c, 220);
      }

      const totalRows = sheet.getLastRow() - 1; // exclude header
      props.setProperty('lastSync_' + sheetName, JSON.stringify({
        timestamp: new Date().toISOString(),
        action: 'append',
        rowCount: totalRows,
      }));

      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, action: 'append', rows: records.length, totalRows }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── Replace action (default — module sheets) ─────────────────
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    } else {
      sheet.clearContents();
      sheet.clearFormats();
    }

    if (!labels || labels.length === 0) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, rows: 0 }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (!records || records.length === 0) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, rows: 0 }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── Header row ──────────────────────────────────────────────
    sheet.getRange(1, 1, 1, labels.length).setValues([labels]);

    const hRange = sheet.getRange(1, 1, 1, labels.length);
    hRange.setBackground('#1d4ed8');
    hRange.setFontColor('#ffffff');
    hRange.setFontWeight('bold');
    hRange.setHorizontalAlignment('center');
    hRange.setVerticalAlignment('middle');
    hRange.setWrap(false);
    sheet.setRowHeight(1, 32);
    sheet.setFrozenRows(1);

    // ── Data rows ───────────────────────────────────────────────
    if (records && records.length > 0) {
      const rows = records.map(r =>
        keys.map(k => {
          const v = r[k];
          if (v === null || v === undefined) return '';
          if (k === 'signature') return '[signed]'; // skip base64 blob
          if (typeof v === 'boolean') return v ? '✓' : '';
          if (k === 'decision') {
            if (v === 'approved') return '✅ Approved';
            if (v === 'notApproved') return '❌ Not Approved';
            return '⏳ Pending';
          }
          if (k === 'alcohol' && typeof v === 'string' && parseFloat(v) <= 1) {
            // Convert 0–1 fraction to percentage string
            return (parseFloat(v) * 100).toFixed(1) + '%';
          }
          return String(v);
        })
      );
      sheet.getRange(2, 1, rows.length, keys.length).setValues(rows);

      // Alternate row shading for readability
      for (let i = 0; i < rows.length; i++) {
        const color = i % 2 === 0 ? '#f8fafc' : '#ffffff';
        sheet.getRange(i + 2, 1, 1, keys.length).setBackground(color);
      }
    }

    // ── Auto-resize columns ─────────────────────────────────────
    sheet.autoResizeColumns(1, labels.length);

    // Cap column width at 220px for readability
    for (let c = 1; c <= labels.length; c++) {
      if (sheet.getColumnWidth(c) > 220) sheet.setColumnWidth(c, 220);
    }

    props.setProperty('lastSync_' + sheetName, JSON.stringify({
      timestamp: new Date().toISOString(),
      action: 'replace',
      rowCount: records ? records.length : 0,
    }));

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, rows: records ? records.length : 0 }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Required: allows the web app to respond to GET (health check + sync verification)
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'health';

  if (action === 'syncStatus') {
    try {
      const sheetName = e.parameter.sheet;
      const props = PropertiesService.getScriptProperties();
      const lastSyncRaw = props.getProperty('lastSync_' + sheetName);
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(sheetName);

      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'ok',
          sheet: sheetName,
          exists: !!sheet,
          rowCount: sheet ? Math.max(0, sheet.getLastRow() - 1) : 0,
          lastSync: lastSyncRaw ? JSON.parse(lastSyncRaw) : null,
        }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // ── Get single invitation by token ──────────────────────────
  if (action === 'getInvite') {
    try {
      var token = e.parameter.token;
      var ss2 = SpreadsheetApp.getActiveSpreadsheet();
      var invSheet = ss2.getSheetByName('Invitations');
      if (invSheet) {
        var rows = invSheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          if (rows[i][0] === token) {
            return ContentService
              .createTextOutput(JSON.stringify({
                status: 'ok',
                invite: { token: rows[i][0], email: rows[i][1], role: rows[i][2], inviteStatus: rows[i][3] }
              }))
              .setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'not_found' }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // ── List all invitations ──────────────────────────────────────
  if (action === 'listInvites') {
    try {
      var ss3 = SpreadsheetApp.getActiveSpreadsheet();
      var invSheet2 = ss3.getSheetByName('Invitations');
      var invites = [];
      if (invSheet2 && invSheet2.getLastRow() > 1) {
        var allRows = invSheet2.getDataRange().getValues();
        for (var k = 1; k < allRows.length; k++) {
          invites.push({
            token: allRows[k][0],
            email: allRows[k][1],
            role: allRows[k][2],
            status: allRows[k][3],
            sentAt: allRows[k][4],
            sentBy: allRows[k][5],
            username: allRows[k][6] || '',
          });
        }
      }
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', invites: invites }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Default health check
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      message: 'Factory Control GAS ready',
      timestamp: new Date().toISOString(),
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

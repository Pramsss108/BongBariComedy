// Stub for xlsx (banned heavy package on 503MB Oracle VM)
module.exports = {
  read: () => ({ SheetNames: [], Sheets: {} }),
  readFile: () => ({ SheetNames: [], Sheets: {} }),
  write: () => Buffer.alloc(0),
  writeFile: () => {},
  utils: {
    sheet_to_json: () => [],
    json_to_sheet: () => ({}),
    book_new: () => ({}),
    book_append_sheet: () => {},
    aoa_to_sheet: () => ({}),
    sheet_to_csv: () => '',
  },
};

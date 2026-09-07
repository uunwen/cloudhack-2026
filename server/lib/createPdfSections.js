function createTextPdfSections(pageTexts, totalPages) {
  return pageTexts
    .filter((page) => page.text)
    .map((page) => ({
      sectionTitle: `Page ${page.pageNumber}`,
      bodyText: page.text,
      notes: null,
      pageNumber: page.pageNumber,
      metadata: {
        extractionMethod: 'text',
        totalPages,
        parsedPages: totalPages,
        truncated: false,
      },
    }))
}

function createVisionPdfMetadata(totalPages, parsedPages) {
  const truncated = parsedPages < totalPages
  return {
    extractionMethod: 'vision',
    totalPages,
    parsedPages,
    truncated,
    ...(truncated
      ? { warning: `Only the first ${parsedPages} of ${totalPages} scanned PDF pages were processed.` }
      : {}),
  }
}

module.exports = { createTextPdfSections, createVisionPdfMetadata }

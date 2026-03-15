/**
 * @file App.tsx
 * @brief Root renderer component for the Folio PDF viewer shell.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { PdfViewerScreen } from '@renderer/components/pdf-viewer/PdfViewerScreen'

function App(): React.JSX.Element {
  return <PdfViewerScreen />
}

export default App

/**
 * @file WelcomeScreen.tsx
 * @brief Empty-state screen prompting the user to open a PDF file.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { memo } from 'react'

export interface WelcomeScreenProps {
  onOpenFile: () => Promise<void>
  isLoading: boolean
}

export const WelcomeScreen = memo(function WelcomeScreen({
  onOpenFile,
  isLoading
}: WelcomeScreenProps): React.JSX.Element {
  return (
    <div className="welcome-screen">
      <h1 className="welcome-screen__title">Folio PDF Viewer</h1>
      <p className="welcome-screen__subtitle">Open a PDF to start viewing pages.</p>
      <button className="viewer-button" type="button" onClick={() => void onOpenFile()}>
        {isLoading ? 'Opening…' : 'Open File'}
      </button>
    </div>
  )
})

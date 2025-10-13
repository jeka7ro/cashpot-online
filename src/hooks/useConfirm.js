import { useState } from 'react'

const useConfirm = () => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirmă',
    cancelText: 'Anulează',
    type: 'danger',
    onConfirm: null
  })

  const confirm = (options) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options.title || 'Confirmare',
        message: options.message || 'Ești sigur?',
        confirmText: options.confirmText || 'Confirmă',
        cancelText: options.cancelText || 'Anulează',
        type: options.type || 'danger',
        onConfirm: () => {
          resolve(true)
        }
      })
    })
  }

  const close = () => {
    setConfirmState(prev => ({
      ...prev,
      isOpen: false,
      onConfirm: null
    }))
  }

  return {
    confirmState,
    confirm,
    close
  }
}

export default useConfirm

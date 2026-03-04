import React from 'react'
import { AlertCircle, X } from 'lucide-react'

const DeleteConfirmModal = ({ isOpen, title = "Confirmă ștergerea", message, onConfirm, onCancel, itemName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                        <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h3>
                </div>

                <div className="space-y-4 mb-8">
                    <p className="text-slate-600 dark:text-slate-300">
                        {message || 'Ești sigur că vrei să ștergi acest element? Această acțiune nu poate fi anulată.'}
                    </p>
                    {itemName && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 text-center break-all">
                                {itemName}
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                    >
                        Anulează
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-md shadow-red-500/20 transition-all font-medium"
                    >
                        <div className="flex items-center justify-center space-x-2">
                            <X className="w-4 h-4" />
                            <span>Șterge Definitiv</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default DeleteConfirmModal;

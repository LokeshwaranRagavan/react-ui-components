import { createContext, useContext, ReactNode, FC, Context, ReactElement } from 'react';
import { UseEditorPopupResult } from '../hooks/useEditorPopup';

/**
 * Context for internal editor state.
 *
 * @private
 */
const EditorContext: Context<UseEditorPopupResult> = createContext<UseEditorPopupResult | null>(null);

/**
 * Hook to access the full internal editor state.
 * Used internally by SchedulerEditorPopup and related components.
 *
 * @private
 * @returns {UseEditorPopupResult} The internal editor state from the EditorContext.
 * @throws {Error} If used outside of an EditorProvider.
 */
export const useEditorContext: () => UseEditorPopupResult = (): UseEditorPopupResult => {
    const context: UseEditorPopupResult = useContext(EditorContext);
    if (!context) {
        throw new Error('useEditorContext must be used within EditorProvider');
    }
    return context;
};

/** @private */
interface EditorProviderProps {
    editorState: UseEditorPopupResult;
    children: ReactNode;
}

/**
 * Provider component that makes full editor state available to child components.
 *
 * @param {UseEditorPopupResult} editorState - The editor state to provide.
 * @returns {ReactElement} The provider wrapping the given children.
 */
export const EditorProvider: FC<EditorProviderProps> = ({ editorState, children }: EditorProviderProps): ReactElement => {
    return (
        <EditorContext.Provider value={editorState}>
            {children}
        </EditorContext.Provider>
    );
};

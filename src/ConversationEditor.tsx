import { useEffect, useRef, useState } from 'react';
import { Camera, Trash2, X, LoaderCircle, Check } from 'lucide-react';
import { ConversationAvatar, prepareAvatar } from './Avatar';
import type { Chat } from './types';

export function ConversationEditor({
  chat,
  onSave,
  onClose,
}: {
  chat: Chat;
  onSave: (name: string, avatar?: Blob) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(chat.name);
  const [avatar, setAvatar] = useState<Blob | undefined>(chat.avatar);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  async function choosePhoto(input: File | undefined) {
    if (!input) return;
    setProcessing(true);
    setError('');
    try {
      setAvatar(await prepareAvatar(input));
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setProcessing(false);
      if (file.current) file.current.value = '';
    }
  }
  return (
    <dialog
      ref={dialog}
      className="edit-dialog"
      aria-labelledby="edit-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving && !processing) onClose();
      }}
      onClick={(event) => {
        const node = dialog.current;
        if (event.target !== node || !node || saving || processing) return;
        const bounds = node.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim()) return;
          setSaving(true);
          setError('');
          try {
            await onSave(name.trim(), avatar);
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Could not save the conversation.');
            setSaving(false);
          }
        }}
      >
        <header>
          <div>
            <h2 id="edit-title">Make it yours</h2>
            <p>Choose a name and photo for this conversation.</p>
          </div>
          <button
            type="button"
            className="icon-button"
            disabled={saving || processing}
            aria-label="Close conversation editor"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>
        <div className="edit-avatar">
          <ConversationAvatar chat={{ name, avatar }} large />
          <button
            type="button"
            className="avatar-camera"
            disabled={saving || processing}
            aria-label="Upload conversation photo"
            onClick={() => file.current?.click()}
          >
            {processing ? <LoaderCircle className="spin" size={17} /> : <Camera size={17} />}
          </button>
        </div>
        <div className="avatar-actions">
          <button
            type="button"
            disabled={saving || processing}
            onClick={() => file.current?.click()}
          >
            Upload photo
          </button>
          {avatar && (
            <button
              type="button"
              disabled={saving || processing}
              onClick={() => setAvatar(undefined)}
            >
              <Trash2 size={13} />
              Remove
            </button>
          )}
        </div>
        <label className="edit-name">
          Conversation name
          <input
            autoFocus
            value={name}
            maxLength={80}
            required
            disabled={saving}
            onChange={(event) => setName(event.target.value)}
            placeholder="Give this conversation a name"
          />
        </label>
        <span className="edit-help">
          This changes your archive’s label, not the original messages.
        </span>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <footer>
          <button
            type="button"
            className="outline-button"
            disabled={saving || processing}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="primary-button"
            type="submit"
            disabled={saving || processing || !name.trim()}
          >
            {saving ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}Save changes
          </button>
        </footer>
        <input
          ref={file}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          hidden
          onChange={(event) => choosePhoto(event.target.files?.[0])}
        />
      </form>
    </dialog>
  );
}

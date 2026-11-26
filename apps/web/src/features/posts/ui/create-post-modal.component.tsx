import { Dialog, Flex, IconButton } from '@radix-ui/themes';
import { useTranslation } from 'next-i18next/pages';

import type { CreatePostVariables } from '@/features/posts/api/use-posts';
import { CreatePostForm } from '@/features/posts/ui/create-post-form.component';

type CreatePostModalProps = {
  open: boolean;
  onClose: () => void;
  onPublish: (payload: CreatePostVariables) => void;
};

export function CreatePostModal({
  open,
  onClose,
  onPublish,
}: CreatePostModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog.Root
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <Dialog.Content
        maxWidth="512px"
        className="community-modal-panel border-highlight/20 bg-page/95 max-h-[min(90vh,720px)] border p-5 shadow-[0_24px_80px_rgb(0_0_0/0.55)] motion-safe:animate-[community-modal-in_0.45s_cubic-bezier(0.16,1,0.3,1)_both] sm:p-6"
      >
        <Flex align="start" justify="between" gap="3" mb="4">
          <Flex direction="column" gap="1">
            <Dialog.Title size="4" mb="0" className="text-highlight">
              {t('posts.create_modal_title')}
            </Dialog.Title>
            <Dialog.Description
              size="1"
              color="gray"
              className="text-foreground/60"
            >
              {t('posts.create_modal_subtitle')}
            </Dialog.Description>
          </Flex>
          <Dialog.Close>
            <IconButton
              type="button"
              variant="ghost"
              color="gray"
              size="2"
              aria-label={t('posts.create_close')}
              className="cursor-pointer"
            >
              <span aria-hidden>✕</span>
            </IconButton>
          </Dialog.Close>
        </Flex>

        <CreatePostForm
          onPublish={onPublish}
          onSuccess={onClose}
          onCancel={onClose}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}

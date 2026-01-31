import {
  Box,
  Button,
  Card,
  CardBody,
  HStack,
  IconButton,
  Image,
  SimpleGrid,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import { FiTrash2, FiUpload } from "react-icons/fi";
import type { WorkOrderPhoto } from "../../lib/firebase/db";
import { deleteWorkOrderPhoto, uploadWorkOrderPhoto } from "../../lib/firebase/db";

export function WorkOrderPhotos({
  woId,
  photos,
  createdBy,
}: {
  woId: string;
  photos: WorkOrderPhoto[];
  createdBy?: string | null;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      const arr = Array.from(files);

      for (const f of arr) {
        if (!f.type.startsWith("image/")) continue;
        await uploadWorkOrderPhoto(woId, f, createdBy ?? null);
      }

      toast({ status: "success", title: "Fotos enviadas" });
    } catch (e: any) {
      toast({ status: "error", title: "Erro ao enviar foto", description: e?.message || String(e) });
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onDelete(p: WorkOrderPhoto) {
    try {
      await deleteWorkOrderPhoto(woId, p);
      toast({ status: "success", title: "Foto removida" });
    } catch (e: any) {
      toast({ status: "error", title: "Erro ao remover foto", description: e?.message || String(e) });
    }
  }

  return (
    <Card>
      <CardBody>
        <HStack justify="space-between" mb={3}>
          <Text fontWeight="900">Fotos do serviço</Text>

          <Button
            leftIcon={<FiUpload />}
            size="sm"
            colorScheme="brand"
            isLoading={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            Enviar fotos
          </Button>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => onPickFiles(e.target.files)}
          />
        </HStack>

        {photos.length === 0 ? (
          <Text color="gray.600" fontSize="sm">
            Nenhuma foto anexada ainda.
          </Text>
        ) : (
          <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
            {photos.map((p) => (
              <Box key={p.id} borderWidth="1px" borderRadius="14px" overflow="hidden">
                <Box position="relative">
                  <Image src={p.url} alt={p.name} w="100%" h="140px" objectFit="cover" />
                  <IconButton
                    aria-label="Remover"
                    icon={<FiTrash2 />}
                    size="sm"
                    variant="solid"
                    colorScheme="red"
                    position="absolute"
                    top="8px"
                    right="8px"
                    onClick={() => onDelete(p)}
                  />
                </Box>
                <Stack p={2} spacing={0}>
                  <Text fontSize="xs" color="gray.600" noOfLines={1}>
                    {p.name}
                  </Text>
                </Stack>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </CardBody>
    </Card>
  );
}

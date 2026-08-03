import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import SingleSelect from "../../components/SingleSelect";
import PhotoPicker from "../../components/PhotoPicker";
import FormSection from "../../components/FormSection";
import FormActions from "../../components/FormActions";
import { newId } from "../../db/rowMapping";
import useTheme from "../../theme/useTheme";
import useCommonStyles from "../../theme/commonStyles";
import type { UmbrellaItem, UmbrellaType } from "../../types";

const TYPE_OPTIONS: UmbrellaType[] = ["compact", "full-size", "golf"];
const WIND_RATING_OPTIONS: UmbrellaItem["windRating"][] = ["low", "med", "high"];

interface Props {
  initial?: UmbrellaItem;
  onSubmit: (item: UmbrellaItem) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onMarkUnavailable?: () => void;
}

export default function UmbrellaForm({ initial, onSubmit, onCancel, onDelete, onMarkUnavailable }: Props) {
  const theme = useTheme();
  const styles = useCommonStyles();
  const [id] = useState(() => initial?.id ?? newId());
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<UmbrellaType>(initial?.type ?? "compact");
  const [windRating, setWindRating] = useState<UmbrellaItem["windRating"]>(initial?.windRating ?? "med");
  const [photoUri, setPhotoUri] = useState<string | undefined>(initial?.photoUri);

  const canSubmit = name.trim().length > 0;

  function handleSubmit() {
    onSubmit({ ...initial, id, name: name.trim(), type, windRating, photoUri });
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <FormSection title="Basics">
        <PhotoPicker itemId={id} photoUri={photoUri} onChange={setPhotoUri} />
        <View>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
            placeholder="Black golf umbrella"
          />
        </View>
      </FormSection>

      <FormSection title="Details">
        <View>
          <Text style={styles.fieldLabel}>Type</Text>
          <SingleSelect options={TYPE_OPTIONS} value={type} onChange={setType} />
        </View>
        <View>
          <Text style={styles.fieldLabel}>Wind rating</Text>
          <SingleSelect options={WIND_RATING_OPTIONS} value={windRating} onChange={setWindRating} />
        </View>
      </FormSection>

      <FormActions
        onCancel={onCancel}
        onSubmit={handleSubmit}
        canSubmit={canSubmit}
        secondary={onMarkUnavailable ? { label: "Mark unavailable until…", onPress: onMarkUnavailable } : undefined}
        destructive={onDelete ? { label: "Delete item", onPress: onDelete } : undefined}
      />
    </ScrollView>
  );
}

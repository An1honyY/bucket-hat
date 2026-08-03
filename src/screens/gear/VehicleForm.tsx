import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import SingleSelect from "../../components/SingleSelect";
import PhotoPicker from "../../components/PhotoPicker";
import FormSection from "../../components/FormSection";
import FormActions from "../../components/FormActions";
import { newId } from "../../db/rowMapping";
import useTheme from "../../theme/useTheme";
import useCommonStyles from "../../theme/commonStyles";
import type { VehicleItem, VehicleType } from "../../types";

const TYPE_OPTIONS: VehicleType[] = ["car", "bike", "motorcycle", "scooter", "none"];
const PROTECTION_OPTIONS: VehicleItem["weatherProtection"][] = ["full", "partial", "none"];

interface Props {
  initial?: VehicleItem;
  onSubmit: (item: VehicleItem) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function VehicleForm({ initial, onSubmit, onCancel, onDelete }: Props) {
  const theme = useTheme();
  const styles = useCommonStyles();
  const [id] = useState(() => initial?.id ?? newId());
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<VehicleType>(initial?.type ?? "car");
  const [weatherProtection, setWeatherProtection] = useState<VehicleItem["weatherProtection"]>(
    initial?.weatherProtection ?? "full"
  );
  const [photoUri, setPhotoUri] = useState<string | undefined>(initial?.photoUri);

  const canSubmit = name.trim().length > 0;

  function handleSubmit() {
    onSubmit({ ...initial, id, name: name.trim(), type, weatherProtection, photoUri });
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
            placeholder="Honda Civic"
          />
        </View>
      </FormSection>

      <FormSection title="Details">
        <View>
          <Text style={styles.fieldLabel}>Type</Text>
          <SingleSelect options={TYPE_OPTIONS} value={type} onChange={setType} />
        </View>
        <View>
          <Text style={styles.fieldLabel}>Weather protection</Text>
          <SingleSelect options={PROTECTION_OPTIONS} value={weatherProtection} onChange={setWeatherProtection} />
        </View>
      </FormSection>

      <FormActions
        onCancel={onCancel}
        onSubmit={handleSubmit}
        canSubmit={canSubmit}
        destructive={onDelete ? { label: "Delete vehicle", onPress: onDelete } : undefined}
      />
    </ScrollView>
  );
}

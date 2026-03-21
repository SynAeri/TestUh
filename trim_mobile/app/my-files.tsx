import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Directory } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

type EntryItem = {
  id: string;
  uri: string;
  name: string;
  kind: 'folder' | 'file';
  size?: number;
  modifiedAt?: number;
};

type FolderShortcut = {
  label: string;
  folderName: string;
  icon: keyof typeof MaterialIcons.glyphMap;
};

const SHORTCUTS: FolderShortcut[] = [
  { label: 'Downloads', folderName: 'Download', icon: 'download' },
  { label: 'Documents', folderName: 'Documents', icon: 'description' },
  { label: 'Movies', folderName: 'Movies', icon: 'movie' },
  { label: 'Pictures', folderName: 'Pictures', icon: 'photo-library' },
];

export default function MyFilesScreen() {
  const [folderName, setFolderName] = useState<string | null>(null);
  const [folderUri, setFolderUri] = useState<string | null>(null);
  const [entries, setEntries] = useState<EntryItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function loadEntriesFromUri(uri: string, visibleName: string) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const childUris =
        Platform.OS === 'android'
          ? await LegacyFileSystem.StorageAccessFramework.readDirectoryAsync(uri)
          : new Directory(uri).list().map((entry) => entry.uri);

      const mappedEntries: Array<EntryItem | null> = await Promise.all(
        childUris.map(async (childUri) => {
          const info = await LegacyFileSystem.getInfoAsync(childUri);

          if (!info.exists) {
            return null;
          }

          const entry: EntryItem = {
            id: childUri,
            uri: childUri,
            name: getNameFromUri(childUri),
            kind: info.isDirectory ? 'folder' : 'file',
            size: info.isDirectory ? undefined : info.size,
            modifiedAt: info.modificationTime,
          };

          return entry;
        })
      );

      const nextEntries = mappedEntries
        .filter((entry): entry is EntryItem => entry !== null)
        .sort((left, right) => {
          if (left.kind !== right.kind) {
            return left.kind === 'folder' ? -1 : 1;
          }

          return left.name.localeCompare(right.name);
        });

      setFolderName(visibleName);
      setFolderUri(uri);
      setEntries(nextEntries);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load files from this folder.';
      setErrorMessage(message);
      Alert.alert('Could not load files', message);
    } finally {
      setIsLoading(false);
    }
  }

  async function openShortcut(shortcut: FolderShortcut) {
    if (Platform.OS !== 'android') {
      await openCustomFolder();
      return;
    }

    try {
      setErrorMessage(null);
      setIsLoading(true);

      const initialUri =
        LegacyFileSystem.StorageAccessFramework.getUriForDirectoryInRoot(shortcut.folderName);
      const permission =
        await LegacyFileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri);

      if (!permission.granted) {
        setIsLoading(false);
        return;
      }

      await loadEntriesFromUri(permission.directoryUri, shortcut.label);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to request folder access.';
      setErrorMessage(message);
      Alert.alert('Permission problem', message);
      setIsLoading(false);
    }
  }

  async function openCustomFolder() {
    try {
      setErrorMessage(null);
      setIsLoading(true);

      const directory = await Directory.pickDirectoryAsync();
      await loadEntriesFromUri(directory.uri, getNameFromUri(directory.uri) || 'Selected folder');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to open folder picker.';
      const looksLikeCancel = /cancel/i.test(message);

      if (!looksLikeCancel) {
        setErrorMessage(message);
        Alert.alert('Could not open folder', message);
      }
      setIsLoading(false);
    }
  }

  async function handleEntryPress(entry: EntryItem) {
    if (entry.kind === 'folder') {
      await loadEntriesFromUri(entry.uri, entry.name);
      return;
    }

    Alert.alert(
      entry.name,
      [`Size: ${formatBytes(entry.size ?? 0)}`, `Modified: ${formatTimestamp(entry.modifiedAt)}`].join(
        '\n'
      )
    );
  }

  function handleInfoPress(entry: EntryItem) {
    Alert.alert(
      entry.name,
      [
        `Type: ${entry.kind === 'folder' ? 'Folder' : 'File'}`,
        entry.kind === 'file' ? `Size: ${formatBytes(entry.size ?? 0)}` : null,
        `Modified: ${formatTimestamp(entry.modifiedAt)}`,
        `URI: ${entry.uri}`,
      ]
        .filter(Boolean)
        .join('\n')
    );
  }

  function handleDeletePress(entry: EntryItem) {
    Alert.alert(
      `Delete ${entry.name}?`,
      'This will remove it from the selected folder.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await LegacyFileSystem.deleteAsync(entry.uri, { idempotent: true });
              setEntries((current) => current.filter((item) => item.id !== entry.id));
            } catch (error) {
              const message =
                error instanceof Error ? error.message : 'Unable to delete this item.';
              Alert.alert('Delete failed', message);
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons color="#183B63" name="arrow-back-ios-new" size={18} />
        </Pressable>

        <View style={styles.headerCopy}>
          <ThemedText style={styles.title}>My Files</ThemedText>
          <ThemedText style={styles.subtitle}>
            Open common folders, browse files, read info, and delete what you don&apos;t need.
          </ThemedText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.shortcutRow}
        horizontal
        showsHorizontalScrollIndicator={false}>
        {SHORTCUTS.map((shortcut) => (
          <Pressable
            key={shortcut.label}
            onPress={() => openShortcut(shortcut)}
            style={styles.shortcutCard}>
            <View style={styles.shortcutIcon}>
              <MaterialIcons color="#1F4E79" name={shortcut.icon} size={18} />
            </View>
            <ThemedText style={styles.shortcutLabel}>{shortcut.label}</ThemedText>
          </Pressable>
        ))}

        <Pressable onPress={openCustomFolder} style={styles.shortcutCard}>
          <View style={styles.shortcutIcon}>
            <MaterialIcons color="#1F4E79" name="folder-open" size={18} />
          </View>
          <ThemedText style={styles.shortcutLabel}>Custom</ThemedText>
        </Pressable>
      </ScrollView>

      <View style={styles.pathCard}>
        <ThemedText style={styles.pathLabel}>Current folder</ThemedText>
        <ThemedText style={styles.pathValue}>{folderName ?? 'Choose a folder shortcut'}</ThemedText>
        <ThemedText numberOfLines={2} style={styles.pathHint}>
          {folderUri ??
            (Platform.OS === 'android'
              ? 'Android will ask permission for the selected public folder.'
              : 'Pick a folder to browse files the app can access.')}
        </ThemedText>
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
        </View>
      ) : null}

      <FlatList
        contentContainerStyle={styles.listContent}
        data={entries}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons color="#90A4B8" name="folder-copy" size={34} />
            <ThemedText style={styles.emptyTitle}>
              {isLoading ? 'Loading files...' : 'Nothing open yet'}
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              {isLoading
                ? 'We are reading the selected folder.'
                : 'Use Downloads, Documents, Movies, or another folder shortcut to start browsing.'}
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => void handleEntryPress(item)} style={styles.entryRow}>
            <View
              style={[
                styles.entryIconWrap,
                item.kind === 'folder' ? styles.folderIconWrap : styles.fileIconWrap,
              ]}>
              <MaterialIcons
                color={item.kind === 'folder' ? '#996C00' : '#1F4E79'}
                name={item.kind === 'folder' ? 'folder' : 'insert-drive-file'}
                size={18}
              />
            </View>

            <View style={styles.entryText}>
              <ThemedText numberOfLines={1} style={styles.entryName}>
                {item.name}
              </ThemedText>
              <ThemedText style={styles.entryDetail}>
                {item.kind === 'folder'
                  ? 'Folder'
                  : `${formatBytes(item.size ?? 0)} • ${formatTimestamp(item.modifiedAt)}`}
              </ThemedText>
            </View>

            <Pressable onPress={() => handleInfoPress(item)} style={styles.actionButton}>
              <MaterialIcons color="#1F4E79" name="info-outline" size={18} />
            </Pressable>

            <Pressable onPress={() => handleDeletePress(item)} style={styles.actionButtonDanger}>
              <MaterialIcons color="#B42318" name="delete-outline" size={18} />
            </Pressable>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function formatBytes(bytes: number) {
  if (!bytes) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatTimestamp(timestamp?: number) {
  if (!timestamp) {
    return 'Unknown';
  }

  return new Date(timestamp * 1000).toLocaleString();
}

function getNameFromUri(uri: string) {
  const sanitizedUri = uri.replace(/\/+$/, '');
  const parts = sanitizedUri.split('/');
  return decodeURIComponent(parts[parts.length - 1] || 'Selected folder');
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingTop: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F7FB',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: '#11263C',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
  },
  subtitle: {
    color: '#688097',
    fontSize: 15,
    lineHeight: 22,
  },
  shortcutRow: {
    gap: 12,
    paddingTop: 22,
    paddingBottom: 8,
  },
  shortcutCard: {
    width: 102,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#F8FBFD',
    borderWidth: 1,
    borderColor: '#E3EDF5',
  },
  shortcutIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF4FF',
  },
  shortcutLabel: {
    marginTop: 12,
    color: '#16324E',
    fontSize: 14,
    fontWeight: '600',
  },
  pathCard: {
    marginTop: 12,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#F8FBFD',
    borderWidth: 1,
    borderColor: '#E3EDF5',
  },
  pathLabel: {
    color: '#7890A4',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pathValue: {
    marginTop: 8,
    color: '#16324E',
    fontSize: 18,
    fontWeight: '600',
  },
  pathHint: {
    marginTop: 6,
    color: '#71869A',
    fontSize: 13,
    lineHeight: 19,
  },
  errorCard: {
    marginTop: 14,
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
    lineHeight: 20,
  },
  listContent: {
    paddingTop: 18,
    paddingBottom: 28,
    gap: 12,
  },
  emptyState: {
    marginTop: 52,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyTitle: {
    marginTop: 14,
    color: '#18324C',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 8,
    color: '#7A8EA1',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECF2F7',
  },
  entryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderIconWrap: {
    backgroundColor: '#FFF6DA',
  },
  fileIconWrap: {
    backgroundColor: '#EAF4FF',
  },
  entryText: {
    flex: 1,
  },
  entryName: {
    color: '#17334D',
    fontSize: 15,
    fontWeight: '600',
  },
  entryDetail: {
    marginTop: 3,
    color: '#7B8FA2',
    fontSize: 13,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FB',
  },
  actionButtonDanger: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F1',
  },
});

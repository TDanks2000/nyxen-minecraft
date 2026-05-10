# CurseForge Browser Goal

Create a reusable CurseForge browser component for the Minecraft client.

## Objective

Build a large full-screen-style dialog/modal for browsing CurseForge Minecraft content. It should respect the existing app topbar/header height and feel like a polished in-app marketplace, not a small popup.

The browser should support CurseForge categories such as:

* Mods
* Modpacks
* Resource packs
* Shaders
* Worlds
* Any other Minecraft content types already supported by the app or CurseForge API layer

## Core Requirements

* Build the UI as a reusable component.
* The component should be openable from anywhere in the app.
* Support an optional `initialCategory` prop.
* If `initialCategory` is provided, open directly on that tab.
* If no category is provided, use a sensible default tab.
* Browsing CurseForge content should work even when no Minecraft instance is selected.
* Installing, uninstalling, updating, and installed-state indicators should require a selected instance.
* Keep install/download logic decoupled from the UI.
* Use callback props for actions instead of hardcoding backend behavior.
* Use strong TypeScript types.
* Do not use `any`.

## Selected Instance Support

The component should accept an optional selected Minecraft instance.

When an instance is selected:

* Show the selected instance clearly near the top of the dialog.
* Use the instance to determine available install actions.
* Show which CurseForge items are already installed in that instance.
* Allow compatible items to be installed into that instance through callback props.
* Allow installed items to show uninstall/update states if callback props are available.

When no instance is selected:

* Still allow browsing CurseForge.
* Disable or hide install actions.
* Show helpful text such as: “Select an instance to install content.”
* Do not block the whole browser just because no instance is selected.

## Installed Content Support

Support passing installed content by category.

Example installed content categories:

* Installed mods
* Installed modpacks
* Installed resource packs
* Installed shaders
* Installed worlds

Installed content should be matched against CurseForge results using stable identifiers where possible:

* CurseForge project ID
* CurseForge file ID
* Slug
* Other reliable IDs already available in the app

Avoid matching only by display name.

Show clear states on cards:

* Install
* Installed
* Installing
* Update available
* Incompatible
* Failed
* Select instance

## Suggested Types

```ts
type CurseForgeCategory =
	| "mods"
	| "modpacks"
	| "resource-packs"
	| "shaders"
	| "worlds";

type SelectedInstance = {
	id: string;
	name: string;
	minecraftVersion: string;
	loader?: "forge" | "fabric" | "quilt" | "neoforge" | "vanilla";
	iconUrl?: string;
};

type InstalledCurseForgeItem = {
	projectId: string;
	fileId?: string;
	slug?: string;
	name: string;
	version?: string;
	category: CurseForgeCategory;
};

type InstalledContentByCategory = Partial<
	Record<CurseForgeCategory, Array<InstalledCurseForgeItem>>
>;

type CurseForgeBrowserDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialCategory?: CurseForgeCategory;
	selectedInstance?: SelectedInstance | null;
	availableInstances?: Array<SelectedInstance>;
	installedContent?: InstalledContentByCategory;
	onSelectInstance?: (instance: SelectedInstance) => void;
	onInstall?: (params: {
		instance: SelectedInstance;
		item: CurseForgeItem;
		category: CurseForgeCategory;
	}) => Promise<void> | void;
	onUninstall?: (params: {
		instance: SelectedInstance;
		item: InstalledCurseForgeItem;
		category: CurseForgeCategory;
	}) => Promise<void> | void;
	onUpdate?: (params: {
		instance: SelectedInstance;
		item: CurseForgeItem;
		installedItem: InstalledCurseForgeItem;
		category: CurseForgeCategory;
	}) => Promise<void> | void;
};
```

## UI Requirements

Create a premium Minecraft-client-friendly interface.

The dialog should include:

* Strong header section
* CurseForge title and description
* Selected instance selector/status
* Search input
* Category tabs
* Filters
* Sort controls
* Result grid/list
* Loading state
* Empty state
* Error state
* Optional detail preview panel if useful

Useful filters may include:

* Minecraft version
* Mod loader
* Category
* Sort by relevance, popularity, downloads, recently updated
* Installed-only toggle when an instance is selected

## Card Requirements

Each CurseForge result card should show useful metadata:

* Icon/image
* Name
* Author
* Short description
* Downloads
* Last updated date
* Minecraft version support
* Loader support
* Category
* Install/installed/update state

Cards should be easy to scan and should not feel cluttered.

## UX Rules

* Browsing should always be available.
* Instance-specific actions should only be available with a selected instance.
* Make it obvious what instance content will be installed into.
* Make installed items visually clear.
* Prevent duplicate installs.
* Show incompatible content clearly when version or loader does not match.
* Do not make the UI feel like disconnected sections.
* Keep the hierarchy clean and professional.
* Prioritize practical browsing UX over decoration.

## Implementation Rules

* Keep the component modular.
* Split large sections into smaller components.
* Use existing app UI primitives where possible.
* Keep state handling easy to extend.
* Do not hardcode the UI for only one category.
* Do not tightly couple this component to one instance implementation.
* Do not wire real install/download logic unless an existing service already exists.
* Prefer callback props for install, uninstall, update, select instance, and open details.
* Add clear null handling around optional selected instance and optional installed content.
* Avoid `any`.
* Keep the code clean, reusable, and scalable.

## Final Outcome

The final result should feel like a core feature of a professional Minecraft launcher.

It should let users browse CurseForge content globally, select an instance, see which items are already installed for that instance, and install compatible CurseForge content into the selected instance through clean callback-based APIs.

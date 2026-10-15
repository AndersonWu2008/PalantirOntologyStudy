# Palantir Object Type and Property schema

We model object types and properties as Ontology Manager metadata. The JSON Schema in `ontology/schema/` records ID, RID, API name, display and plural names, groups, icon, visibility, status, primary key, title key, base type, render hints, shared properties, and value types. Backing datasources, index status, and writeback are omitted because they are storage and pipeline concerns, not the type definition. Primary key is a single property API name because Palantir treats it as one unique identifier, not a composite list.

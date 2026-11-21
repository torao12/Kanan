db = db.getSiblingDB("kanan_docs");

db.createCollection("webhooks_bancarios", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["webhook_id", "proveedor", "payload", "recibido_en", "procesado"],
      properties: {
        webhook_id: { bsonType: "string" },
        proveedor: { bsonType: "string" },
        payload: { bsonType: "object" },
        recibido_en: { bsonType: "date" },
        procesado: { bsonType: "bool" }
      }
    }
  }
});
db.webhooks_bancarios.createIndex({ webhook_id: 1 }, { unique: true });

db.createCollection("expedientes_cfdi", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["uuid_fiscal", "rfc_emisor", "rfc_receptor", "xml_raw", "conceptos"],
      properties: {
        uuid_fiscal: { bsonType: "string" },
        rfc_emisor: { bsonType: "string" },
        rfc_receptor: { bsonType: "string" },
        xml_raw: { bsonType: "string" },
        conceptos: { bsonType: "array" }
      }
    }
  }
});
db.expedientes_cfdi.createIndex({ uuid_fiscal: 1 }, { unique: true });

db.createCollection("bitacora_boveda", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["evento_id", "boveda_id", "usuario_id", "tipo_evento", "monto", "fecha_timestamp"],
      properties: {
        evento_id: { bsonType: "string" },
        boveda_id: { bsonType: "string" },
        usuario_id: { bsonType: "string" },
        tipo_evento: { enum: ["PROVISION_AUTOMATICA", "RUPTURA_CRISTAL", "REABASTECIMIENTO"] },
        monto: { bsonType: ["double", "int", "decimal"] },
        fecha_timestamp: { bsonType: "date" }
      }
    }
  }
});
db.bitacora_boveda.createIndex({ evento_id: 1 }, { unique: true });

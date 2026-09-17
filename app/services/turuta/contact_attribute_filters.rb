# [turuta] Filtrar CHATS por atributos de CONTACTO.
#
# Chatwoot solo deja filtrar los chats por atributos de conversacion: los de
# contacto solo sirven para filtrar contactos. En un CRM inmobiliario lo que se
# busca ("distrito", "presupuesto") vive en el contacto, asi que se anade.
#
# La interfaz manda la clave con un prefijo: "contact_attribute:distrito". Asi la
# condicion viaja sola por todas partes (filtro aplicado, filtro guardado,
# contador de no leidos) sin campos extra, y no choca con un atributo de
# conversacion que se llame igual. Aqui se traduce a lo que el resto del
# servicio ya entiende: la clave sin prefijo y custom_attribute_type, que
# Filters::CustomAttributeFilterHelper ya sabe resolver contra la tabla
# contacts. Lo unico que faltaba era pedirselo y unir esa tabla.
#
# Va con prepend sobre Conversations::FilterService, y por herencia llega a
# Conversations::UnreadCounts::FilterQueryCounter, que cuenta los no leidos de
# los filtros guardados. Por eso el trabajo se hace en query_builder, que usan
# los dos, y no en perform ni en base_relation, que la subclase redefine.
module Turuta::ContactAttributeFilters
  PREFIX = 'contact_attribute:'.freeze
  CONTACT_MODEL = 'contact_attribute'.freeze

  def build_condition_query(model_filters, query_hash, current_index)
    return super unless turuta_contact_condition?(query_hash)

    # Sin la tabla de filtros estandar: un atributo de contacto que se llame como
    # uno de ellos ("status") no debe tratarse como tal.
    super({}, query_hash, current_index)
  end

  def handle_nil_filter(query_hash, current_index)
    return super unless turuta_contact_condition?(query_hash)

    custom_attribute_query(query_hash, CONTACT_MODEL, current_index)
  end

  private

  def query_builder(model_filters)
    turuta_normalize_contact_conditions
    relation = super
    turuta_contact_conditions? ? relation.joins(:contact) : relation
  end

  def turuta_normalize_contact_conditions
    Array(@params[:payload]).each do |query_hash|
      key = query_hash['attribute_key'].to_s
      next unless key.start_with?(PREFIX)

      query_hash['attribute_key'] = key.delete_prefix(PREFIX)
      query_hash['custom_attribute_type'] = CONTACT_MODEL
    end
  end

  def turuta_contact_conditions?
    Array(@params[:payload]).any? { |query_hash| turuta_contact_condition?(query_hash) }
  end

  def turuta_contact_condition?(query_hash)
    query_hash['custom_attribute_type'].to_s == CONTACT_MODEL
  end
end

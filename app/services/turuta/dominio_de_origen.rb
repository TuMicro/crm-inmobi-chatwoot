require 'uri'

# [turuta] Instagram y TikTok cuando la misma instalacion se sirve en varios
# dominios (docs/21 § 4.4 del repo crm-inmobi): el de FRONTEND_URL y los de
# CHATWOOT_HOSTS_EXTRA, que sirve Caddy con otra marca (docs/19 y docs/23).
#
# 1. La vuelta. Meta y TikTok tienen registrada una sola direccion de vuelta
#    del OAuth (y TikTok, un webhook). Su base es TURUTA_URL_DE_VUELTA, p. ej.
#    https://app.crm.inmobipro.com: en produccion FRONTEND_URL es el dominio
#    de MadHouse desde el 03/11 (docs/24 § 6b), para que los correos de
#    Chatwoot lleven a el, y los permisos de los demas clientes no pueden
#    pasar por ese dominio. Si falta, FRONTEND_URL, como en Chatwoot.
#
# 2. El dominio de origen. Quien conecta desde otro dominio que el de la
#    vuelta acabaria en el de la vuelta, con otra marca y sin sesion (la sesion
#    es por dominio). El dominio por el que se pidio el permiso viaja en el
#    state del OAuth, el JWT firmado con la clave de la app que ya lleva la
#    cuenta, y la vuelta redirige a ese dominio. Solo si es uno del CRM
#    (FRONTEND_URL y CHATWOOT_HOSTS_EXTRA, menos el de la vuelta, que no lo
#    necesita), al pedirlo y otra vez al volver; cualquier otro valor se ignora
#    y la vuelta se queda donde llega, como en Chatwoot: nada de redirecciones
#    abiertas. Es lo que hace calendar_connections.origin en la API de
#    crm-inmobi con Google Calendar (services/api/src/common/origenes.ts).
#
# Ruby sin Rails, para que la CI del fork lo pruebe con ruby -e. Las variables
# se leen de `entorno`: ENV, o un Hash en las pruebas. Lo usan
# InstagramConcern y Tiktok::AuthClient (url_de_vuelta), los
# authorizations_controller de Instagram y TikTok (origen, al pedir) y sus
# callbacks_controller (EnLaVuelta, al volver).
module Turuta
  module DominioDeOrigen
    # La base de lo registrado en Meta y TikTok, sin barra final.
    def self.url_de_vuelta(entorno = ENV)
      propia = entorno.fetch('TURUTA_URL_DE_VUELTA', '').to_s.strip.sub(%r{/+\z}, '')
      return entorno.fetch('FRONTEND_URL', 'http://localhost:3000') if propia.empty?

      propia.match?(%r{\Ahttps?://}i) ? propia : "https://#{propia}"
    end

    # Los dominios desde los que se vuelve a ellos mismos.
    def self.permitidos(entorno = ENV)
      dominios = [entorno.fetch('FRONTEND_URL', '')] + entorno.fetch('CHATWOOT_HOSTS_EXTRA', '').to_s.split(/[\s,]+/)
      dominios.map { |dominio| host_de(dominio) }.compact.uniq - [host_de(url_de_vuelta(entorno))]
    end

    # El dominio, si es uno de los permitidos; si no, nil.
    def self.origen(host, entorno = ENV)
      dominio = host_de(host)
      dominio if dominio && permitidos(entorno).include?(dominio)
    end

    # Las opciones de URL de la vuelta: el dominio de origen, con https como lo
    # sirve Caddy. Vacio si no hay: el dominio por el que llega la vuelta.
    def self.opciones_de_url(host, entorno = ENV)
      dominio = origen(host, entorno)
      return {} if dominio.nil?

      nombre, puerto = dominio.split(':', 2)
      { host: nombre, port: puerto&.to_i, protocol: 'https' }
    end

    # "crm.cliente.com" (o "crm.cliente.com:8443"), en minusculas, sin
    # https:// ni camino; nil si no parece un dominio.
    def self.host_de(valor)
      limpio = valor.to_s.strip.downcase.sub(%r{\Ahttps?://}, '').sub(%r{[/?#].*\z}, '')
      limpio if limpio.match?(/\A[a-z0-9.-]+(:\d+)?\z/)
    end

    # Para los callbacks_controller de Instagram y TikTok, que definen
    # dominio_de_origen (lo leen de su state firmado).
    module EnLaVuelta
      # Las direcciones que genera el controlador (app_new_instagram_inbox_url,
      # app_tiktok_inbox_agents_url...) van al dominio de origen.
      def default_url_options
        super.merge(opciones_de_vuelta)
      end

      # Rails no deja redirigir a otro dominio que el de la peticion
      # (raise_on_open_redirects): se deja solo al de origen, ya comprobado.
      def redirect_to(options = {}, response_options = {})
        return super unless al_dominio_de_origen?(options)

        super(options, response_options.merge(allow_other_host: true))
      end

      private

      def opciones_de_vuelta
        @opciones_de_vuelta ||= DominioDeOrigen.opciones_de_url(dominio_de_origen)
      end

      def al_dominio_de_origen?(url)
        destino = opciones_de_vuelta[:host]
        !destino.nil? && url.is_a?(String) && URI.parse(url).host == destino
      rescue URI::Error
        false
      end
    end
  end
end

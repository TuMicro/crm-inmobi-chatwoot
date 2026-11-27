require 'uri'

# [turuta] Volver al dominio de origen al conectar Instagram o TikTok (docs/21
# § 4.4 del repo crm-inmobi). La misma instalacion se sirve en varios
# dominios: el principal (FRONTEND_URL) y los de CHATWOOT_HOSTS_EXTRA, que
# sirve Caddy con otra marca (docs/19 y docs/23). Meta y TikTok solo tienen
# registrada una direccion de vuelta, la del dominio principal: sin esto,
# quien conecta desde el dominio de su inmobiliaria acaba en el principal,
# con otra marca y sin sesion (la sesion es por dominio).
#
# El dominio por el que se pidio el permiso viaja en el state del OAuth, el
# JWT firmado con la clave de la app que ya lleva la cuenta, y la vuelta
# redirige a ese dominio. Solo si es uno de CHATWOOT_HOSTS_EXTRA, al pedirlo y
# otra vez al volver; cualquier otro valor se ignora y se queda en el
# principal, como en Chatwoot: nada de redirecciones abiertas. Es lo mismo que
# hace calendar_connections.origin en la API de crm-inmobi con Google Calendar
# (services/api/src/common/origenes.ts).
#
# Ruby sin Rails, para que la CI del fork lo pruebe con ruby -e. Lo usan los
# authorizations_controller de Instagram y TikTok (al pedir) y sus
# callbacks_controller (al volver, con EnLaVuelta).
module Turuta
  module DominioDeOrigen
    # "crm.cliente.com" (o "crm.cliente.com:8443"), en minusculas, sin
    # https:// ni camino; nil si no parece un dominio.
    def self.host_de(valor)
      limpio = valor.to_s.strip.downcase.sub(%r{\Ahttps?://}, '').sub(%r{[/?#].*\z}, '')
      limpio if limpio.match?(/\A[a-z0-9.-]+(:\d+)?\z/)
    end

    # El dominio, si es uno de los extra del CRM (no el principal); si no, nil.
    def self.extra(host, frontend_url = ENV.fetch('FRONTEND_URL', ''), hosts_extra = ENV.fetch('CHATWOOT_HOSTS_EXTRA', ''))
      dominio = host_de(host)
      return nil if dominio.nil? || dominio == host_de(frontend_url)

      dominio if hosts_extra.to_s.split(/[\s,]+/).map { |h| host_de(h) }.include?(dominio)
    end

    # Las opciones de URL de la vuelta: el dominio extra, con https como lo
    # sirve Caddy. Vacio si no es uno extra: el de siempre (el principal, por
    # el que llega la vuelta).
    def self.opciones_de_url(host, frontend_url = ENV.fetch('FRONTEND_URL', ''), hosts_extra = ENV.fetch('CHATWOOT_HOSTS_EXTRA', ''))
      dominio = extra(host, frontend_url, hosts_extra)
      return {} if dominio.nil?

      nombre, puerto = dominio.split(':', 2)
      { host: nombre, port: puerto&.to_i, protocol: 'https' }
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

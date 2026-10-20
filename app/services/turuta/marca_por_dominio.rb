# [turuta] La marca segun el dominio por el que se entra (docs/19 del repo
# crm-inmobi). La misma instalacion se ve con otra marca en otro dominio:
# Flyboard es la generica, para ensenar el CRM a otros clientes.
#
# TURUTA_MARCAS_POR_DOMINIO dice que marca va en cada dominio, separados por
# comas:
#
#   TURUTA_MARCAS_POR_DOMINIO=flyboard.crm.inmobipro.com=flyboard
#
# El dominio principal, y cualquiera que no este en la lista, sigue con la
# marca de TURUTA_BRAND_NAME, TURUTA_LOGO... El layout (vueapp.html.erb)
# superpone estas claves a window.globalConfig; los ficheros viven en
# public/brand-assets. Ruby sin Rails: la CI del fork lo prueba con ruby -e.
module Turuta
  module MarcaPorDominio
    MARCAS = {
      'flyboard' => {
        'INSTALLATION_NAME' => 'Flyboard CRM',
        'BRAND_NAME' => 'Flyboard CRM',
        'LOGO' => '/brand-assets/flyboard-logo-dark.png',
        'LOGO_DARK' => '/brand-assets/flyboard-logo-white.png',
        'LOGO_THUMBNAIL' => '/brand-assets/flyboard-icon.png',
        'LOGO_THUMBNAIL_DARK' => '/brand-assets/flyboard-icon.png',
        # Arriba del menu, junto al icono, Chatwoot pone el nombre de la
        # cuenta; con esta marca va el de la marca (turuta/marca.js).
        'TURUTA_NOMBRE_EN_MENU' => 'Flyboard',
        # Marca generica: no se ensena de que webs salen las propiedades
        # (turuta/webs.js las llama "Web 1", "Web 2"...).
        'TURUTA_OCULTAR_WEBS' => true
      }.freeze
    }.freeze

    # Las claves de la marca de ese dominio, o nil si va con la de siempre.
    def self.de(host, variable = ENV.fetch('TURUTA_MARCAS_POR_DOMINIO', ''))
      dominio = host.to_s.strip.downcase
      return nil if dominio.empty?

      variable.to_s.split(',').each do |par|
        de_dominio, marca = par.split('=', 2).map { |trozo| trozo.to_s.strip.downcase }
        return MARCAS[marca] if de_dominio == dominio && MARCAS.key?(marca)
      end
      nil
    end
  end
end
